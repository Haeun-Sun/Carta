/**
 * 점수 = 최신성 점수(0~70) + 반응 점수(0~30)
 * 게시 후 6시간 이내면 최신성 만점, 72시간이 지나면 0점으로 선형 감소합니다.
 * @param {Array<object>} candidates
 */
export function rankCandidates(candidates) {
  const now = Date.now();

  return candidates
    .map((c) => {
      const ageHours = (now - new Date(c.publishedAt).getTime()) / 3600000;
      const recencyScore = Math.max(0, 70 * (1 - Math.max(0, ageHours - 6) / 66));

      const engagement = (c.viewCount ?? 0) + (c.likeCount ?? 0) * 5;
      const engagementScore = Math.min(30, Math.log10(engagement + 1) * 6);

      return { ...c, score: Math.round((recencyScore + engagementScore) * 10) / 10 };
    })
    .sort((a, b) => b.score - a.score);
}
