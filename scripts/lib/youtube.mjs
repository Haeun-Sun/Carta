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

async function fetchChannelVideos(studio, apiKey) {
  const channelId = studio.channelId || (await resolveChannelId(studio.youtube, apiKey));
  if (!channelId) {
    console.warn(`[youtube] 채널을 찾을 수 없어 건너뜁니다: ${studio.name} (${studio.youtube})`);
    return [];
  }

  // "최신작"과 "역대 인기작(오래됐어도 훌륭한 대표작)"을 함께 가져옵니다.
  const [recentIds, popularIds] = await Promise.all([
    searchChannel(channelId, apiKey, "date", 8),
    searchChannel(channelId, apiKey, "viewCount", 8)
  ]);
  const ids = [...new Set([...recentIds, ...popularIds])];
  if (ids.length === 0) return [];

  const statsUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
  statsUrl.searchParams.set("part", "snippet,statistics,contentDetails");
  statsUrl.searchParams.set("id", ids.join(","));
  statsUrl.searchParams.set("key", apiKey);

  const statsRes = await fetch(statsUrl);
  if (!statsRes.ok) return [];
  const statsJson = await statsRes.json();

  const results = [];
  for (const item of statsJson.items ?? []) {
    const seconds = parseDurationSeconds(item.contentDetails?.duration);
    if (isLikelyShort(item.snippet.title, item.snippet.description, seconds)) continue;
    results.push(toCandidate(item, studio));
  }
  return results;
}

/**
 * studios.mjs에 등록된 신뢰 채널들의 "최신작 + 역대 인기작"을 함께 수집합니다.
 * 날짜 제한이 없으므로, 예전 대표작이어도 채널의 인기작이면 후보에 포함됩니다.
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
