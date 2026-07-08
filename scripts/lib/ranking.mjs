// 플랫폼별 "인기 기준선". 유튜브 조회수는 비메오 재생수보다 규모가 훨씬 커서,
// 원본 숫자를 그대로 비교하면 유튜브 대형 채널이 항상 이깁니다. 그래서 각 영상의
// 인기도를 "그 플랫폼 기준으로 얼마나 인기 있나"로 환산(정규화)합니다.
// 이렇게 하면 비메오의 디자인 명작(재생수 수만)이 유튜브 인기작(조회수 수백만)과
// 동등하게 경쟁할 수 있습니다.
const PLATFORM_BASELINE = { vimeo: 2000, youtube: 50000 };

/**
 * 점수 = 최신성 점수(0~50) + 반응 점수(0~40, 플랫폼 정규화)
 * 게시 후 6시간 이내면 최신성 만점, 이후 30일(720시간)에 걸쳐 완만히 0점까지 감소합니다.
 * 예전 대표작도 인기도로 충분히 경쟁할 수 있도록 인기도 비중을 크게 뒀습니다.
 * @param {Array<object>} candidates
 */
export function rankCandidates(candidates) {
  const now = Date.now();

  return candidates
    .map((c) => {
      const ageHours = (now - new Date(c.publishedAt).getTime()) / 3600000;
      const recencyScore = Math.max(0, 50 * (1 - Math.max(0, ageHours - 6) / 720));

      const engagement = (c.viewCount ?? 0) + (c.likeCount ?? 0) * 5;
      const baseline = PLATFORM_BASELINE[c.source] ?? 50000;
      const engagementScore = Math.min(40, Math.log10(engagement / baseline + 1) * 20);

      return { ...c, score: Math.round((recencyScore + engagementScore) * 10) / 10 };
    })
    .sort((a, b) => b.score - a.score);
}
