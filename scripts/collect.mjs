import { getServiceClient } from "./lib/supabase.mjs";
import { fetchYoutubeCandidates, fetchGlobalSearchCandidates } from "./lib/youtube.mjs";
import { fetchVimeoCandidates, fetchStaffPicksCandidates } from "./lib/vimeo.mjs";
import { rankCandidates } from "./lib/ranking.mjs";
import { analyzeReference } from "./lib/analyze.mjs";
import { makeGifThumbnail } from "./lib/gif.mjs";

const MAX_PER_RUN = Number(process.env.MAX_PER_RUN ?? 5);
// AI가 매기는 10점 만점 퀄리티 점수의 통과 기준. 스튜디오 화이트리스트/Staff Picks
// 출처가 아닌 후보는 이 점수를 넘겨야 최종 저장됩니다.
const QUALITY_THRESHOLD = Number(process.env.QUALITY_THRESHOLD ?? 6);

async function main() {
  const supabase = getServiceClient();

  const { data: existingUrls } = await supabase.from("references").select("source_url");
  const seen = new Set((existingUrls ?? []).map((r) => r.source_url));

  const [studioYoutube, studioVimeo, staffPicks, globalSearch] = await Promise.all([
    fetchYoutubeCandidates(5), // 큐레이션된 스튜디오 채널 (신뢰 소스)
    fetchVimeoCandidates(5), // 큐레이션된 스튜디오 채널 (신뢰 소스)
    fetchStaffPicksCandidates(5), // Vimeo 에디터 큐레이션 (신뢰 소스)
    fetchGlobalSearchCandidates(5) // 화이트리스트 밖 전세계 검색 (AI 퀄리티 게이트 필요)
  ]);

  const fresh = [...studioYoutube, ...studioVimeo, ...staffPicks, ...globalSearch].filter(
    (c) => !seen.has(c.sourceUrl)
  );

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
