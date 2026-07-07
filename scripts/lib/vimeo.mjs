import { STUDIOS } from "./studios.mjs";

function isLikelyShort(name, description, seconds) {
  if (seconds > 0 && seconds < 60) return true;
  const text = `${name} ${description}`.toLowerCase();
  return /#shorts?\b/.test(text);
}

/**
 * Vimeo가 자체 에디터팀을 통해 매일 엄선하는 공식 큐레이션 채널입니다.
 * 특정 스튜디오 목록에 없어도, 전세계 어디서 만들었든 퀄리티가 이미
 * 검증된 영상들이 계속 올라오는 소스라 스튜디오 화이트리스트의 한계를
 * 보완해줍니다. (공식 문서화된 엔드포인트입니다)
 */
export async function fetchStaffPicksCandidates(daysBack = 5) {
  const token = process.env.VIMEO_ACCESS_TOKEN;
  if (!token) return [];

  const url = new URL("https://api.vimeo.com/channels/staffpicks/videos");
  url.searchParams.set("sort", "date");
  url.searchParams.set("direction", "desc");
  url.searchParams.set("per_page", "20");
  url.searchParams.set(
    "fields",
    "uri,name,description,link,release_time,created_time,duration,stats.plays,pictures.sizes,user.name"
  );

  const res = await fetch(url, {
    headers: {
      Authorization: `bearer ${token}`,
      Accept: "application/vnd.vimeo.*+json;version=3.4"
    }
  });
  if (!res.ok) {
    console.warn("[vimeo] Staff Picks 조회 실패");
    return [];
  }

  const json = await res.json();
  const cutoff = Date.now() - daysBack * 86400000;
  const results = [];

  for (const v of json.data ?? []) {
    const publishedAt = v.release_time ?? v.created_time;
    if (new Date(publishedAt).getTime() < cutoff) continue;
    if (isLikelyShort(v.name, v.description ?? "", v.duration ?? 0)) continue;

    results.push({
      source: "vimeo",
      sourceUrl: v.link,
      title: v.name,
      author: v.user?.name ?? null,
      category: "Vimeo Staff Picks",
      trustedQuality: true, // 이미 에디터 검증을 거쳤으므로 AI 퀄리티 게이트를 건너뜁니다
      thumbnailUrl: v.pictures?.sizes?.at(-1)?.link,
      publishedAt,
      viewCount: v.stats?.plays ?? 0,
      description: v.description ?? ""
    });
  }
  return results;
}

async function fetchUserVideosBySort(studio, token, sort) {
  const url = new URL(`https://api.vimeo.com/users/${studio.vimeo}/videos`);
  url.searchParams.set("sort", sort);
  url.searchParams.set("direction", "desc");
  url.searchParams.set("per_page", "10");
  url.searchParams.set(
    "fields",
    "uri,name,description,link,release_time,created_time,duration,stats.plays,pictures.sizes"
  );

  const res = await fetch(url, {
    headers: {
      Authorization: `bearer ${token}`,
      Accept: "application/vnd.vimeo.*+json;version=3.4"
    }
  });

  if (!res.ok) {
    console.warn(`[vimeo] 사용자를 찾을 수 없어 건너뜁니다: ${studio.name} (vimeo.com/${studio.vimeo})`);
    return [];
  }

  const json = await res.json();
  return json.data ?? [];
}

/**
 * "최신작"(sort=date)과 "역대 인기작"(sort=plays)을 함께 가져옵니다.
 * YouTube 수집과 동일하게 날짜 제한을 두지 않아, 예전 대표작도 랭킹에서
 * 인기도로 경쟁할 수 있습니다(오래된 후보는 ranking.mjs의 최신성 점수가
 * 자연히 낮아지고, 이미 저장된 영상은 collect.mjs의 URL 중복 체크로 걸러집니다).
 */
async function fetchUserVideos(studio, token) {
  const [recent, popular] = await Promise.all([
    fetchUserVideosBySort(studio, token, "date"),
    fetchUserVideosBySort(studio, token, "plays")
  ]);

  const byUri = new Map();
  for (const v of [...recent, ...popular]) {
    if (!byUri.has(v.uri)) byUri.set(v.uri, v);
  }

  const results = [];
  for (const v of byUri.values()) {
    if (isLikelyShort(v.name, v.description ?? "", v.duration ?? 0)) continue;

    results.push({
      source: "vimeo",
      sourceUrl: v.link,
      title: v.name,
      author: studio.name,
      category: studio.category,
      trustedQuality: true, // 큐레이션된 스튜디오 목록 출처는 AI 퀄리티 게이트를 건너뜁니다
      thumbnailUrl: v.pictures?.sizes?.at(-1)?.link,
      publishedAt: v.release_time ?? v.created_time,
      viewCount: v.stats?.plays ?? 0,
      description: v.description ?? ""
    });
  }
  return results;
}

/**
 * studios.mjs에 등록된 신뢰 Vimeo 사용자(스튜디오)들의 "최신작 + 역대 인기작"을 함께 수집합니다.
 * @returns {Promise<Array<object>>}
 */
export async function fetchVimeoCandidates() {
  const token = process.env.VIMEO_ACCESS_TOKEN;
  if (!token) return [];

  const vimeoStudios = STUDIOS.filter((s) => s.vimeo);

  const results = await Promise.all(
    vimeoStudios.map((studio) =>
      fetchUserVideos(studio, token).catch((err) => {
        console.warn(`[vimeo] ${studio.name} 수집 실패:`, err.message);
        return [];
      })
    )
  );

  return results.flat();
}
