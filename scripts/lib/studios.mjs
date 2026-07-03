/**
 * 자동 수집 대상이 되는 "신뢰 소스" 목록입니다.
 * 여기 있는 스튜디오/기업의 공식 채널에 새로 올라온 영상만 후보로 수집합니다
 * (일반 키워드 검색은 더 이상 사용하지 않습니다 — 아무나 올린 영상이 섞이는 걸 막기 위함).
 *
 * 특정 국가/문화권에 치우치지 않도록 북미·유럽·아시아 스튜디오를 고루 섞었고,
 * 모션그래픽·VFX·애니메이션뿐 아니라 뮤직비디오 프로덕션도 포함합니다.
 *
 * category는 카드에 표시되는 분류 태그입니다.
 * youtube: 채널 핸들(@ 포함), vimeo: vimeo.com/뒤에 오는 사용자명
 *
 * 핸들이 바뀌었거나 오타가 있어도 프로그램이 죽지 않고 그 항목만 건너뜁니다.
 * 자유롭게 추가/삭제/수정하세요.
 */
export const STUDIOS = [
  // 모션그래픽 스튜디오 — 북미/유럽
  { name: "BUCK", category: "모션그래픽 스튜디오", vimeo: "buck" },
  { name: "Gentleman Scholar", category: "모션그래픽 스튜디오", vimeo: "gentlemanscholar" },
  { name: "Giant Ant", category: "모션그래픽 스튜디오", vimeo: "giantant" },
  { name: "ManvsMachine", category: "모션그래픽 스튜디오", vimeo: "manvsmachine" },
  { name: "Psyop", category: "모션그래픽 스튜디오", vimeo: "psyop" },
  { name: "Elastic", category: "모션그래픽 스튜디오", vimeo: "elastic" },
  { name: "Trollbäck+Company", category: "모션그래픽 스튜디오", vimeo: "trollback" },
  { name: "Ordinary Folk", category: "모션그래픽 스튜디오", vimeo: "ordinaryfolk" },
  { name: "Golden Wolf", category: "모션그래픽 스튜디오", vimeo: "goldenwolf" },

  // 모션그래픽 스튜디오 — 아시아
  { name: "WOW inc.", category: "모션그래픽 스튜디오", vimeo: "wowinc" }, // 일본, 도쿄/센다이
  { name: "Bright Young Things (Studio BYTS)", category: "모션그래픽 스튜디오", vimeo: "byts" }, // 대한민국, 서울

  // VFX 스튜디오 — 전세계
  { name: "The Mill", category: "VFX 스튜디오", vimeo: "themill" }, // 영국/미국
  { name: "Framestore", category: "VFX 스튜디오", vimeo: "framestore" }, // 영국
  { name: "Blur Studio", category: "VFX 스튜디오", youtube: "@BlurStudio" }, // 미국
  { name: "Industrial Light & Magic", category: "VFX 스튜디오", youtube: "@InsideILM" }, // 미국
  { name: "Sehsucht", category: "VFX 스튜디오", vimeo: "sehsucht" }, // 독일
  { name: "Ars Thanea", category: "VFX 스튜디오", vimeo: "arsthanea" }, // 폴란드
  { name: "Territory Studio", category: "VFX 스튜디오", vimeo: "territorystudio" }, // 영국

  // 애니메이션 스튜디오 / 영화사
  { name: "LAIKA", category: "애니메이션 스튜디오", youtube: "@LAIKAStudios" }, // 미국
  { name: "Cartoon Saloon", category: "애니메이션 스튜디오", youtube: "@CartoonSaloonStudio" }, // 아일랜드
  { name: "Pixar", category: "애니메이션 스튜디오", youtube: "@Pixar" }, // 미국

  // 뮤직비디오 프로덕션
  { name: "Partizan", category: "뮤직비디오 프로덕션", youtube: "@PartizanOfficial" }, // 프랑스/전세계

  // 테크/IT 기업 (고퀄리티 제품·브랜드 영상)
  { name: "Apple", category: "테크 기업", youtube: "@Apple" } // 미국
];
