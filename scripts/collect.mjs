import { getServiceClient } from "./lib/supabase.mjs";
import { fetchYoutubeCandidates } from "./lib/youtube.mjs";
import { fetchVimeoCandidates, fetchStaffPicksCandidates } from "./lib/vimeo.mjs";
import { fetchCurationFeedCandidates } from "./lib/feeds.mjs";
import { rankCandidates } from "./lib/ranking.mjs";
import { analyzeReference } from "./lib/analyze.mjs";
import { makeGifThumbnail } from "./lib/gif.mjs";

const MAX_PER_RUN = Number(process.env.MAX_PER_RUN ?? 5);
// AI 퀄리티 게이트 기준점. 현재 자동 수집 소스는 모두 신뢰 소스라 게이트를 타지
// 않지만, 수동 추가(manual-add) 등 trustedQuality가 아닌 후보가 들어올 경우를
// 대비해 로직은 남겨둡니다.
const QUALITY_THRESHOLD = Number(process.env.QUALITY_THRESHOLD ?? 6);

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

  let saved = 0;
  for (const candidate of ranked) {
    if (saved >= MAX_PER_RUN) break;

    const analysis = await analyzeReference(candidate);

    // 신뢰 소스가 아닌데 AI가 명확히 저품질로 판단했다면 건너뜁니다.
    // qualityScore가 null이면(AI 키 미설정 등) 판별 불가로 보고 통과시킵니다.
    if (!candidate.trustedQuality && analysis.qualityScore !== null && analysis.qualityScore < QUALITY_THRESHOLD) {
      console.log(`  [skip] 퀄리티 미달(${analysis.qualityScore}/10): ${candidate.title}`);
      continue;
    }

    const category = candidate.category ?? analysis.suggestedCategory ?? null;
    console.log(`  [pick] [${category ?? "미분류"}] ${candidate.author ?? "?"} — ${candidate.title}`);

    const gifUrl = await makeGifThumbnail(candidate.sourceUrl);

    const { error } = await supabase.from("references").insert({
      source: candidate.source,
      source_url: candidate.sourceUrl,
      title: candidate.title,
      author: candidate.author ?? null,
      category,
      thumbnail_url: gifUrl ?? candidate.thumbnailUrl ?? null,
      description: analysis.description || null,
      keywords: analysis.keywords ?? [],
      published_at: candidate.publishedAt,
      score: candidate.score
    });

    if (error) {
      console.error(`  [error] 저장 실패 (${candidate.title}):`, error.message);
      continue;
    }

    saved += 1;
  }

  console.log(`[done] ${saved}개 큐레이션 완료.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
