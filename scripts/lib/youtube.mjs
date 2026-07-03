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

async function fetchChannelVideos(studio, apiKey, daysBack) {
  const channelId = await resolveChannelId(studio.youtube, apiKey);
  if (!channelId) {
    console.warn(`[youtube] 채널을 찾을 수 없어 건너뜁니다: ${studio.name} (${studio.youtube})`);
    return [];
  }

  const publishedAfter = new Date(Date.now() - daysBack * 86400000).toISOString();

  const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
  searchUrl.searchParams.set("part", "snippet");
  searchUrl.searchParams.set("channelId", channelId);
  searchUrl.searchParams.set("type", "video");
  searchUrl.searchParams.set("order", "date");
  searchUrl.searchParams.set("publishedAfter", publishedAfter);
  searchUrl.searchParams.set("maxResults", "10");
  searchUrl.searchParams.set("key", apiKey);

  const searchRes = await fetch(searchUrl);
  if (!searchRes.ok) return [];
  const searchJson = await searchRes.json();
  const ids = (searchJson.items ?? []).map((item) => item.id?.videoId).filter(Boolean);
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

    results.push({
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
    });
  }
  return results;
}

/**
 * studios.mjs에 등록된 신뢰 채널들의 최근 업로드만 수집합니다.
 * @param {number} daysBack
 * @returns {Promise<Array<object>>}
 */
export async function fetchYoutubeCandidates(daysBack = 5) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return [];

  const youtubeStudios = STUDIOS.filter((s) => s.youtube);
  const results = await Promise.all(
    youtubeStudios.map((studio) =>
      fetchChannelVideos(studio, apiKey, daysBack).catch((err) => {
        console.warn(`[youtube] ${studio.name} 수집 실패:`, err.message);
        return [];
      })
    )
  );

  return results.flat();
}

// 특정 스튜디오 목록에 없어도 전세계 어디서 만든 영상이든 발견할 수 있도록,
// 영어/한국어 키워드로 폭넓게 검색합니다. 이 경로로 들어온 후보는
// 화이트리스트 검증이 안 됐으므로 trustedQuality를 표시하지 않고,
// analyze.mjs의 AI 퀄리티 게이트를 반드시 거치게 됩니다.
const GLOBAL_SEARCH_TERMS = [
  "motion graphics reel",
  "VFX breakdown",
  "brand film CGI",
  "모션그래픽 릴",
  "모션그래픽 스튜디오",
  "브랜드 필름 CF",
  "타이포그래피 애니메이션"
];

async function searchGlobalTerm(term, apiKey, publishedAfter) {
  const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
  searchUrl.searchParams.set("part", "snippet");
  searchUrl.searchParams.set("q", term);
  searchUrl.searchParams.set("type", "video");
  searchUrl.searchParams.set("order", "date");
  searchUrl.searchParams.set("videoDefinition", "high"); // HD 미만은 애초에 제외 (품질 1차 필터)
  searchUrl.searchParams.set("publishedAfter", publishedAfter);
  searchUrl.searchParams.set("maxResults", "8");
  searchUrl.searchParams.set("key", apiKey);

  const searchRes = await fetch(searchUrl);
  if (!searchRes.ok) return [];
  const searchJson = await searchRes.json();
  const ids = (searchJson.items ?? []).map((item) => item.id?.videoId).filter(Boolean);
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
    // 너무 긴 원본 영상(예: 편집 안 된 raw footage, 강의 등)은 레퍼런스 성격과
    // 맞지 않아 15분을 넘으면 제외합니다.
    if (seconds > 900) continue;

    results.push({
      source: "youtube",
      sourceUrl: `https://www.youtube.com/watch?v=${item.id}`,
      title: item.snippet.title,
      author: item.snippet.channelTitle,
      category: null, // AI가 분석 후 알맞은 분류를 붙여줍니다
      trustedQuality: false,
      thumbnailUrl: item.snippet.thumbnails?.high?.url ?? item.snippet.thumbnails?.default?.url,
      publishedAt: item.snippet.publishedAt,
      viewCount: Number(item.statistics?.viewCount ?? 0),
      likeCount: Number(item.statistics?.likeCount ?? 0),
      description: item.snippet.description
    });
  }
  return results;
}

/**
 * 스튜디오 화이트리스트에 없는 영상도 발견할 수 있도록 전세계 대상으로
 * 폭넓게 검색합니다. 여기서 나온 후보는 AI 퀄리티 게이트(analyze.mjs)를
 * 반드시 통과해야 최종 저장됩니다.
 * @param {number} daysBack
 */
export async function fetchGlobalSearchCandidates(daysBack = 5) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return [];

  const publishedAfter = new Date(Date.now() - daysBack * 86400000).toISOString();
  const results = await Promise.all(
    GLOBAL_SEARCH_TERMS.map((term) =>
      searchGlobalTerm(term, apiKey, publishedAfter).catch((err) => {
        console.warn(`[youtube] "${term}" 검색 실패:`, err.message);
        return [];
      })
    )
  );

  return results.flat();
}
