// 사용법:
// node scripts/manual-add.mjs \
//   --url "https://www.behance.net/gallery/xxxx/yyy" \
//   --title "프로젝트 제목" \
//   --author "제작 스튜디오" \
//   --category "모션그래픽 스튜디오" \
//   --thumbnail "https://.../thumb.jpg" \
//   --description "간단한 설명" \
//   --keywords "타이포그래피,3D 캐릭터"
//
// Behance/Dribbble처럼 yt-dlp로 GIF를 만들 수 없는 소스는 --thumbnail로 넘긴
// 이미지가 그대로 썸네일로 저장됩니다.

import { getServiceClient } from "./lib/supabase.mjs";

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i += 2) {
    out[args[i].replace(/^--/, "")] = args[i + 1];
  }
  return out;
}

async function main() {
  const { url, title, author, category, thumbnail, description, keywords } = parseArgs();

  if (!url || !title) {
    console.error("--url, --title은 필수입니다.");
    process.exit(1);
  }

  const supabase = getServiceClient();

  const { error } = await supabase.from("references").insert({
    source: "manual",
    source_url: url,
    title,
    author: author ?? null,
    category: category ?? null,
    thumbnail_url: thumbnail ?? null,
    description: description ?? null,
    keywords: keywords ? keywords.split(",").map((k) => k.trim()).filter(Boolean) : [],
    published_at: new Date().toISOString(),
    score: null
  });

  if (error) {
    console.error("저장 실패:", error.message);
    process.exit(1);
  }

  console.log("[done] 큐레이션 추가 완료.");
}

main();
