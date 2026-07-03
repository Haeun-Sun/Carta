import Anthropic from "@anthropic-ai/sdk";

const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

async function thumbnailToBase64(url) {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const mediaType = res.headers.get("content-type") || "image/jpeg";
    const buffer = Buffer.from(await res.arrayBuffer());
    return { data: buffer.toString("base64"), mediaType };
  } catch {
    return null;
  }
}

const SYSTEM_PROMPT = `당신은 모션그래픽/영화/애니메이션/뮤직비디오 레퍼런스를 큐레이션하는
까다로운 아트디렉터입니다. 스튜디오 화이트리스트에 없는 영상도 다루므로,
아마추어 습작이나 팬메이드 편집물과 실제 상업/전문 프로덕션을 구분하는 게
당신의 핵심 역할입니다.

주어진 제목, 제작자, 설명, 썸네일 이미지를 보고 아래를 판단하세요.

**qualityScore (1~10)**: 인기(조회수)가 아니라 "제작 퀄리티"만 평가하세요.
- 8~10: 명백히 전문 스튜디오/프로덕션의 상업 작업물 (정교한 렌더링, 세련된 타이포그래피,
  정확한 색보정, 완성도 높은 합성/편집)
- 5~7: 준수한 완성도지만 상업 레벨까지는 아닌 학생작/개인작업
- 1~4: 화질이 낮거나, 편집이 조악하거나, 단순 브이로그/리액션/모음집/팬메이드로 보임
확신이 서지 않으면 점수를 보수적으로 낮게 주세요.

**suggestedCategory**: 아래 중 하나만 선택하세요.
["모션그래픽 스튜디오", "VFX 스튜디오", "애니메이션 스튜디오", "뮤직비디오 프로덕션", "브랜드 필름", "기타"]

반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트나 코드블록 마크다운 없이 순수 JSON만 출력합니다.

{
  "qualityScore": 1~10 사이의 정수,
  "suggestedCategory": "위 목록 중 하나",
  "description": "1~2문장의 짧은 코멘트 (한국어, 80자 내외)",
  "keywords": ["짧은 키워드 태그 2~4개, 예: 타이포그래피, 3D 캐릭터, 리퀴드 모션, 브랜드 필름"]
}`;

function buildPrompt(candidate) {
  return `제목: ${candidate.title}\n제작 스튜디오: ${candidate.author ?? "알 수 없음"}\n분류: ${candidate.category ?? "미분류"}\n설명: ${(candidate.description ?? "").slice(0, 800)}`;
}

/**
 * 우선순위: OPENAI_API_KEY(GPT) → ANTHROPIC_API_KEY(Claude) → 둘 다 없으면 원본 설명 사용.
 * 둘 다 등록되어 있으면 OpenAI(GPT)를 우선 사용합니다.
 * @param {object} candidate
 */
export async function analyzeReference(candidate) {
  if (process.env.OPENAI_API_KEY) {
    return analyzeWithOpenAI(candidate);
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return analyzeWithAnthropic(candidate);
  }

  // AI 키가 없으면 퀄리티 판별 자체가 불가능하므로, 신뢰 소스가 아닌 후보는
  // collect.mjs에서 게이트를 건너뛰고 그대로 통과시킵니다 (qualityScore: null).
  const fallback = (candidate.description || "").trim().replace(/\s+/g, " ").slice(0, 80);
  return { description: fallback || null, keywords: [], qualityScore: null, suggestedCategory: null };
}

async function analyzeWithAnthropic(candidate) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const image = await thumbnailToBase64(candidate.thumbnailUrl);

  const content = [{ type: "text", text: buildPrompt(candidate) }];
  if (image) {
    content.push({ type: "image", source: { type: "base64", media_type: image.mediaType, data: image.data } });
  }

  const response = await anthropic.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 300,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content }]
  });

  const textBlock = response.content.find((b) => b.type === "text");
  const raw = textBlock?.text?.trim() ?? "{}";
  const cleaned = raw.replace(/^```json\s*|```$/g, "");

  try {
    const parsed = JSON.parse(cleaned);
    return {
      description: parsed.description ?? "",
      keywords: parsed.keywords ?? [],
      qualityScore: Number(parsed.qualityScore) || 0,
      suggestedCategory: parsed.suggestedCategory ?? null
    };
  } catch {
    return { description: "", keywords: [], qualityScore: 0, suggestedCategory: null };
  }
}

async function analyzeWithOpenAI(candidate) {
  const image = await thumbnailToBase64(candidate.thumbnailUrl);

  const userContent = [{ type: "text", text: buildPrompt(candidate) }];
  if (image) {
    userContent.push({
      type: "image_url",
      image_url: { url: `data:${image.mediaType};base64,${image.data}` }
    });
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      max_tokens: 300,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent }
      ]
    })
  });

  if (!res.ok) {
    console.error("[openai] 요청 실패:", res.status, await res.text().catch(() => ""));
    return { description: null, keywords: [], qualityScore: null, suggestedCategory: null };
  }

  const json = await res.json();
  const raw = json.choices?.[0]?.message?.content ?? "{}";

  try {
    const parsed = JSON.parse(raw);
    return {
      description: parsed.description ?? "",
      keywords: parsed.keywords ?? [],
      qualityScore: Number(parsed.qualityScore) || 0,
      suggestedCategory: parsed.suggestedCategory ?? null
    };
  } catch {
    return { description: "", keywords: [], qualityScore: 0, suggestedCategory: null };
  }
}
