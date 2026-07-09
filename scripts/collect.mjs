import { getServiceClient } from "./lib/supabase.mjs";
import { fetchYoutubeCandidates, fetchYoutubeRecentDeep } from "./lib/youtube.mjs";
import { fetchVimeoCandidates, fetchStaffPicksCandidates, fetchVimeoRecentDeep } from "./lib/vimeo.mjs";
import { fetchCurationFeedCandidates } from "./lib/feeds.mjs";
import { rankCandidates } from "./lib/ranking.mjs";
import { makeGifThumbnail } from "./lib/gif.mjs";

const MAX_PER_RUN = Number(process.env.MAX_PER_RUN ?? 5);

/**
 * 같은 영상이라도 주소 형태가 다를 수 있어(youtu.be/ID, youtube.com/watch?v=ID,
 * /shorts/ID, 파라미터 유무, vimeo.com/ID 등) 영상 고유 ID로 정규화한 키를 만듭니다.
 * 이 키로 중복을 판별하면 형태가 달라도 같은 영상을 한 번만 담습니다.
 */
function videoKey(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return "yt:" + u.pathname.slice(1);
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v") || u.pathname.match(/\/(?:shorts|embed)\/([\w-]+)/)?.[1];
      if (id) return "yt:" + id;
    }
    if (u.hostname.includes("vimeo.com")) {
      const id = u.pathname.match(/(\d+)/)?.[1];
      if (id) return "vimeo:" + id;
    }
  } catch {
    /* URL 파싱 실패 시 아래 원본 문자열로 폴백 */
  }
  return url;
}

async function main() {
  const supabase = getServiceClient();

  const { data: existingUrls } = await supabase.from("references").select("source_url");
  const seen = new Set((existingUrls ?? []).map((r) => videoKey(r.source_url)));

  const [studioYoutube, studioVimeo, staffPicks, curationFeeds] = await Promise.all([
    fetchYoutubeCandidates(), // 큐레이션된 스튜디오 채널 - 최신작+역대 인기작 (신뢰 소스)
    fetchVimeoCandidates(), // 큐레이션된 스튜디오 채널 - 최신작+역대 인기작 (신뢰 소스)
    fetchStaffPicksCandidates(), // Vimeo 에디터 큐레이션 - 최신+역대 인기 (신뢰 소스)
    fetchCurationFeedCandidates() // Motionographer / The FWA RSS (신뢰 소스)
  ]);

  // 여러 소스가 같은 영상을 중복으로 반환할 수 있어 URL 기준으로 한 번 더 정리합니다.
  const byUrl = new Map();
  const addCandidates = (list) => {
    for (const c of list) {
      const key = videoKey(c.sourceUrl);
      if (!seen.has(key) && !byUrl.has(key)) byUrl.set(key, c);
    }
  };
  addCandidates([...studioYoutube, ...studioVimeo, ...staffPicks, ...curationFeeds]);
  let fresh = [...byUrl.values()];

  // 2차 검색: 1차에서 모은 신규 후보가 목표치보다 적으면, 각 채널의 최신순 목록을
  // 더 깊이 뒤져(YouTube·Vimeo) 아직 수집 안 된 최신 영상들로 부족분을 채웁니다.
  // (조용한 날에도 보드가 최신 작업 위주로 계속 갱신되도록)
  if (fresh.length < MAX_PER_RUN) {
    console.log(`[info] 신규 후보 ${fresh.length}개 → 2차 검색(최신순 심화)으로 보강합니다.`);
    const [ytDeep, vimeoDeep] = await Promise.all([
      fetchYoutubeRecentDeep().catch(() => []),
      fetchVimeoRecentDeep().catch(() => [])
    ]);
    addCandidates([...vimeoDeep, ...ytDeep]);
    fresh = [...byUrl.values()];
  }

  if (fresh.length === 0) {
    console.log("[skip] 새로운 후보가 없습니다.");
    return;
  }

  const ranked = rankCandidates(fresh);
  console.log(`[info] 후보 ${ranked.length}개 중 최대 ${MAX_PER_RUN}개를 채웁니다.`);

  // 한 실행에서 같은 스튜디오/소스가 여러 칸을 독점하지 못하게 막습니다.
  // (예전엔 Netflix가 하루에 5개를 다 가져가 디자인 스튜디오가 안 뜨는 문제가 있었음)
  // author가 있으면 스튜디오 기준, 없으면(큐레이션 매체 등) 소스/분류 기준으로 1개씩만.
  const usedKeys = new Set();

  let saved = 0;
  for (const candidate of ranked) {
    if (saved >= MAX_PER_RUN) break;

    const category = candidate.category ?? null;
    const diversityKey =
      (candidate.author && candidate.author.trim().toLowerCase()) || `src:${category ?? candidate.source}`;
    if (usedKeys.has(diversityKey)) continue;

    console.log(`  [pick] [${category ?? "미분류"}] ${candidate.author ?? "?"} — ${candidate.title}`);

    const gifUrl = await makeGifThumbnail(candidate.sourceUrl);
    const description = (candidate.description ?? "").trim().replace(/\s+/g, " ").slice(0, 120) || null;

    const { error } = await supabase.from("references").insert({
      source: candidate.source,
      source_url: candidate.sourceUrl,
      title: candidate.title,
      author: candidate.author ?? null,
      category,
      thumbnail_url: gifUrl ?? candidate.thumbnailUrl ?? null,
      description,
      keywords: [],
      published_at: candidate.publishedAt,
      score: candidate.score
    });

    if (error) {
      console.error(`  [error] 저장 실패 (${candidate.title}):`, error.message);
      continue;
    }

    usedKeys.add(diversityKey);
    saved += 1;
  }

  console.log(`[done] ${saved}개 큐레이션 완료.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
