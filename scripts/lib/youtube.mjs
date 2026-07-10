import { STUDIOS } from "./studios.mjs";

/** ISO 8601 duration(PT1M30S 등)을 초 단위로 변환 */
function parseDurationSeconds(iso) {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso || "");
  if (!match) return 0;
  const [, h, m, s] = match;
  return (Number(h) || 0) * 3600 + (Number(m) || 0) * 60 + (Number(s) || 0);
}

function isLikelyShort(title, description, seconds) {
  // 쇼츠 판별: YouTube는 세로/정사각형 + 3분 이하를 쇼츠로 분류하지만
  // API로는 영상 방향을 직접 알 수 없어서, 60초 미만(구 쇼츠 기준)과
  // #shorts 태그를 함께 보고 보수적으로 걸러냅니다. 신뢰 채널만 수집하므로
  // 애초에 쇼츠 비중 자체가 낮습니다.
  if (seconds > 0 && seconds < 60) return true;
  const text = `${title} ${description}`.toLowerCase();
  return /#shorts?\b/.test(text);
}

async function resolveChannelId(handle, apiKey) {
  const url = new URL("https://www.googleapis.com/youtube/v3/channels");
  url.searchParams.set("part", "id");
  url.searchParams.set("forHandle", handle.replace(/^@/, ""));
  url.searchParams.set("key", apiKey);

  const res = await fetch(url);
  if (!res.ok) return null;
  const json = await res.json();
  return json.items?.[0]?.id ?? null;
}

async function searchChannel(channelId, apiKey, order, maxResults) {
  const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
  searchUrl.searchParams.set("part", "snippet");
  searchUrl.searchParams.set("channelId", channelId);
  searchUrl.searchParams.set("type", "video");
  searchUrl.searchParams.set("order", order); // 'date' = 최신순, 'viewCount' = 역대 인기순
  searchUrl.searchParams.set("maxResults", String(maxResults));
  searchUrl.searchParams.set("key", apiKey);

  const res = await fetch(searchUrl);
  if (!res.ok) return [];
  const json = await res.json();
  return (json.items ?? []).map((item) => item.id?.videoId).filter(Boolean);
}

function toCandidate(item, studio) {
  return {
    source: "youtube",
    sourceUrl: `https://www.youtube.com/watch?v=${item.id}`,
    title: item.snippet.title,
    author: studio.name,
    category: studio.category,
    trustedQuality: true, // 큐레이션된 스튜디오 채널 출처는 AI 퀄리티 게이트를 건너뜁니다
    thumbnailUrl: item.snippet.thumbnails?.high?.url ?? item.snippet.thumbnails?.default?.url,
    publishedAt: item.snippet.publishedAt,
    viewCount: Number(item.statistics?.viewCount ?? 0),
    likeCount: Number(item.statistics?.likeCount ?? 0),
    description: item.snippet.description
  };
}

/**
 * youtube.com/shorts/{id}로 요청해 "실제 쇼츠"인지 확인합니다.
 * 쇼츠면 그 경로에서 200으로 응답하고, 일반 영상이면 /watch로 리다이렉트(3xx)합니다.
 * 네트워크 오류·타임아웃·리다이렉트 등 불확실한 경우엔 false(쇼츠 아님)로 처리해
 * 정상 영상을 실수로 잃지 않도록 합니다(안전 우선).
 */
async function isYoutubeShort(videoId) {
  try {
    const res = await fetch(`https://www.youtube.com/shorts/${videoId}`, {
      method: "HEAD",
      redirect: "manual",
      signal: AbortSignal.timeout(6000)
    });
    return res.status === 200;
  } catch {
    return false;
  }
}

/** 영상 ID 목록의 상세정보(조회수/길이 등)를 받아 쇼츠를 걸러내고 후보로 변환합니다. */
async function fetchStats(ids, studio, apiKey) {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return [];

  const statsUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
  statsUrl.searchParams.set("part", "snippet,statistics,contentDetails");
  statsUrl.searchParams.set("id", unique.join(","));
  statsUrl.searchParams.set("key", apiKey);

  const statsRes = await fetch(statsUrl);
  if (!statsRes.ok) return [];
  const statsJson = await statsRes.json();

  // 1차: 60초 미만 · #shorts 태그로 빠르게 거르기
  const passed = [];
  for (const item of statsJson.items ?? []) {
    const seconds = parseDurationSeconds(item.contentDetails?.duration);
    if (isLikelyShort(item.snippet.title, item.snippet.description, seconds)) continue;
    passed.push({ item, seconds });
  }

  // 2차: 요즘 쇼츠는 최대 3분이라 60~180초짜리가 1차를 통과할 수 있음.
  // 3분 이하(또는 길이 불명) 영상만 /shorts/ 경로로 실제 쇼츠 여부를 정밀 확인.
  const checked = await Promise.all(
    passed.map(async ({ item, seconds }) => {
      if (seconds <= 180 && (await isYoutubeShort(item.id))) return null;
      return toCandidate(item, studio);
    })
  );
  return checked.filter(Boolean);
}

async function resolveStudioChannelId(studio, apiKey) {
  const channelId = studio.channelId || (await resolveChannelId(studio.youtube, apiKey));
  if (!channelId) {
    console.warn(`[youtube] 채널을 찾을 수 없어 건너뜁니다: ${studio.name} (${studio.youtube})`);
  }
  return channelId;
}

async function fetchChannelVideos(studio, apiKey) {
  const channelId = await resolveStudioChannelId(studio, apiKey);
  if (!channelId) return [];

  // "최신작 최우선" — 채널의 최신 업로드만 가져옵니다.
  // (조회수 상위=역대 인기작 수집은 하지 않음. 그게 d'strict Wave처럼 옛 대박 영상을
  //  계속 끌어오던 원인이었음.) 최신작이 부족한 날엔 collect.mjs의 2차 검색이
  //  최신순으로 더 깊이(=과거 업로드) 내려가 부족분을 채웁니다.
  const recentIds = await searchChannel(channelId, apiKey, "date", 12);
  return fetchStats(recentIds, studio, apiKey);
}

/** 2차 검색용: 채널의 "최신순" 목록을 더 깊이(기본 50개) 가져옵니다. */
async function fetchChannelRecent(studio, apiKey, maxResults) {
  const channelId = await resolveStudioChannelId(studio, apiKey);
  if (!channelId) return [];
  const ids = await searchChannel(channelId, apiKey, "date", maxResults);
  return fetchStats(ids, studio, apiKey);
}

/**
 * studios.mjs에 등록된 신뢰 채널들의 "최신 업로드"를 수집합니다.
 * (역대 인기작=조회수 상위 수집은 하지 않음. 최신작 최우선 원칙)
 * @returns {Promise<Array<object>>}
 */
export async function fetchYoutubeCandidates() {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return [];

  const youtubeStudios = STUDIOS.filter((s) => s.youtube || s.channelId);
  const results = await Promise.all(
    youtubeStudios.map((studio) =>
      fetchChannelVideos(studio, apiKey).catch((err) => {
        console.warn(`[youtube] ${studio.name} 수집 실패:`, err.message);
        return [];
      })
    )
  );

  return results.flat();
}

/**
 * 2차 검색: 신규 업로드가 부족할 때, 각 채널의 최신순 목록을 더 깊이(maxResults개)
 * 가져와 아직 수집 안 된 최신 영상들로 보드를 채웁니다.
 * @param {number} maxResults 채널당 최대 조회 개수 (YouTube 검색 API 상한은 50)
 */
export async function fetchYoutubeRecentDeep(maxResults = 50) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return [];

  const youtubeStudios = STUDIOS.filter((s) => s.youtube || s.channelId);
  const results = await Promise.all(
    youtubeStudios.map((studio) =>
      fetchChannelRecent(studio, apiKey, maxResults).catch((err) => {
        console.warn(`[youtube] ${studio.name} 2차 수집 실패:`, err.message);
        return [];
      })
    )
  );

  return results.flat();
}
