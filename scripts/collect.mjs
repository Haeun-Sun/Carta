import { getServiceClient } from "./lib/supabase.mjs";
import { fetchYoutubeCandidates } from "./lib/youtube.mjs";
import { fetchVimeoCandidates, fetchStaffPicksCandidates } from "./lib/vimeo.mjs";
import { fetchCurationFeedCandidates } from "./lib/feeds.mjs";
import { rankCandidates } from "./lib/ranking.mjs";
import { makeGifThumbnail } from "./lib/gif.mjs";

const MAX_PER_RUN = Number(process.env.MAX_PER_RUN ?? 5);

async function main() {
  const supabase = getServiceClient();

  const { data: existingUrls } = await supabase.from("references").select("source_url");
  const seen = new Set((existingUrls ?? []).map((r) => r.source_url));

  const [studioYoutube, studioVimeo, staffPicks, curationFeeds] = await Promise.all([
    fetchYoutubeCandidates(), // 큐레이션된 스튜디오 채널 - 최신작+역대 인기작 (신뢰 소스)
    fetchVimeoCandidates(), // 큐레이션된 스튜디오 채널 - 최신작+역대 인기작 (신뢰 소스)
    fetchStaffPicksCandidates(), // Vimeo 에디터 큐레이션 - 최신+역대 인기 (신뢰 소스)
    fetchCurationFeedCandidates() // Motionographer / The FWA RSS (신뢰 소스)
  ]);

  // 여러 소스가 같은 영상을 중복으로 반환할 수 있어 URL 기준으로 한 번 더 정리합니다.
  const byUrl = new Map();
  for (const c of [...studioYoutube, ...studioVimeo, ...staffPicks, ...curationFeeds]) {
    if (!seen.has(c.sourceUrl) && !byUrl.has(c.sourceUrl)) byUrl.set(c.sourceUrl, c);
  }
  const fresh = [...byUrl.values()];

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
