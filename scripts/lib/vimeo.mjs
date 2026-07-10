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

function mapVimeoVideo(studio, v) {
  return {
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
  };
}

async function fetchUserVideosBySort(studio, token, sort, perPage = 10) {
  const url = new URL(`https://api.vimeo.com/users/${studio.vimeo}/videos`);
  url.searchParams.set("sort", sort);
  url.searchParams.set("direction", "desc");
  url.searchParams.set("per_page", String(perPage));
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
 * "최신작 최우선" — 스튜디오의 최신 업로드(sort=date)만 가져옵니다.
 * (재생수 상위=역대 인기작 수집은 하지 않음. 옛 대박 영상이 계속 끌려오던 문제 방지.)
 * 최신작이 부족한 날엔 collect.mjs의 2차 검색(fetchVimeoRecentDeep)이 최신순으로
 * 더 깊이 내려가 과거 업로드로 부족분을 채웁니다.
 */
async function fetchUserVideos(studio, token) {
  const recent = await fetchUserVideosBySort(studio, token, "date", 12);

  const results = [];
  for (const v of recent) {
    if (isLikelyShort(v.name, v.description ?? "", v.duration ?? 0)) continue;
    results.push(mapVimeoVideo(studio, v));
  }
  return results;
}

/**
 * studios.mjs에 등록된 신뢰 Vimeo 사용자(스튜디오)들의 "최신 업로드"를 수집합니다.
 * (재생수 상위=역대 인기작 수집은 하지 않음. 최신작 최우선 원칙)
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

/**
 * 2차 검색: 신규 업로드가 부족할 때, 각 Vimeo 스튜디오의 최신순 목록을
 * 더 깊이(perPage개) 가져와 아직 수집 안 된 최신 영상들로 보드를 채웁니다.
 * @param {number} perPage 스튜디오당 최대 조회 개수
 */
export async function fetchVimeoRecentDeep(perPage = 50) {
  const token = process.env.VIMEO_ACCESS_TOKEN;
  if (!token) return [];

  const vimeoStudios = STUDIOS.filter((s) => s.vimeo);

  const results = await Promise.all(
    vimeoStudios.map((studio) =>
      fetchUserVideosBySort(studio, token, "date", perPage)
        .then((videos) =>
          videos
            .filter((v) => !isLikelyShort(v.name, v.description ?? "", v.duration ?? 0))
            .map((v) => mapVimeoVideo(studio, v))
        )
        .catch((err) => {
          console.warn(`[vimeo] ${studio.name} 2차 수집 실패:`, err.message);
          return [];
        })
    )
  );

  return results.flat();
}
