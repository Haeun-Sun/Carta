/**
 * 점수 = 최신성 점수(0~50) + 반응 점수(0~50)
 * 게시 후 6시간 이내면 최신성 만점, 이후 30일(720시간)에 걸쳐 완만히 0점까지 감소합니다.
 * 예전 대표작도 인기도로 충분히 경쟁할 수 있도록 인기도 비중을 최신성과 동일하게 맞췄습니다.
 * @param {Array<object>} candidates
 */
export function rankCandidates(candidates) {
  const now = Date.now();

  return candidates
    .map((c) => {
      const ageHours = (now - new Date(c.publishedAt).getTime()) / 3600000;
      const recencyScore = Math.max(0, 50 * (1 - Math.max(0, ageHours - 6) / 720));

      const engagement = (c.viewCount ?? 0) + (c.likeCount ?? 0) * 5;
      const engagementScore = Math.min(50, Math.log10(engagement + 1) * 10);

      return { ...c, score: Math.round((recencyScore + engagementScore) * 10) / 10 };
    })
    .sort((a, b) => b.score - a.score);
}
