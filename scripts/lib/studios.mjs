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

  { name: "Tendril", category: "모션그래픽 스튜디오", vimeo: "tendril" }, // 미국, 뉴욕
  { name: "FutureDeluxe", category: "모션그래픽 스튜디오", vimeo: "futuredeluxe" }, // 영국, 런던
  { name: "Oddfellows", category: "모션그래픽 스튜디오", vimeo: "oddfellows" }, // 미국, 포틀랜드
  { name: "Aggressive", category: "모션그래픽 스튜디오", vimeo: "aggressive" }, // 프랑스
  { name: "Brand New School", category: "모션그래픽 스튜디오", vimeo: "brandnewschool" }, // 미국, LA
  { name: "Lobo", category: "모션그래픽 스튜디오", vimeo: "lobocx" }, // 브라질
  { name: "nerdo", category: "모션그래픽 스튜디오", vimeo: "nerdo" }, // 이탈리아
  { name: "Art&Graft", category: "모션그래픽 스튜디오", vimeo: "artandgraft" }, // 영국, 런던

  // 모션그래픽 스튜디오 — 아시아
  { name: "WOW inc.", category: "모션그래픽 스튜디오", vimeo: "wowinc" }, // 일본, 도쿄/센다이
  { name: "Bright Young Things (Studio BYTS)", category: "모션그래픽 스튜디오", vimeo: "byts" }, // 대한민국, 서울
  { name: "SUPER VERY MORE", category: "모션그래픽 스튜디오", vimeo: "superverymore" }, // 대한민국, 서울
  { name: "2GREY", category: "모션그래픽 스튜디오", vimeo: "2grey" }, // 대한민국, 서울
  { name: "swim", category: "모션그래픽 스튜디오", vimeo: "swimseoul" }, // 대한민국, 서울

  // VFX 스튜디오 — 전세계
  { name: "The Mill", category: "VFX 스튜디오", vimeo: "themill" }, // 영국/미국
  { name: "Framestore", category: "VFX 스튜디오", vimeo: "framestore" }, // 영국
  { name: "Blur Studio", category: "VFX 스튜디오", youtube: "@BlurStudio" }, // 미국
  { name: "Industrial Light & Magic", category: "VFX 스튜디오", youtube: "@InsideILM" }, // 미국
  { name: "Sehsucht", category: "VFX 스튜디오", vimeo: "sehsucht" }, // 독일
  { name: "Ars Thanea", category: "VFX 스튜디오", vimeo: "arsthanea" }, // 폴란드
  { name: "Territory Studio", category: "VFX 스튜디오", vimeo: "territorystudio" }, // 영국

  // 애니메이션 스튜디오
  // (Pixar·Disney·Sony·Netflix처럼 영화 트레일러만 올리는 채널은 "디자인 레퍼런스"가
  //  아니라 콘텐츠 홍보물이라 제외함. 공정/아트하우스 성격이 강한 곳만 유지)
  { name: "LAIKA", category: "애니메이션 스튜디오", youtube: "@LAIKAStudios" }, // 미국 (스톱모션 제작 공정)
  { name: "Cartoon Saloon", category: "애니메이션 스튜디오", youtube: "@CartoonSaloonStudio" }, // 아일랜드 (아트하우스)
  { name: "Passion Pictures", category: "애니메이션 스튜디오", vimeo: "passionpictures" }, // 영국

  // 미디어아트
  { name: "teamLab", category: "미디어아트", channelId: "UCYab90rmhVPfbrnmN-Zmwhg" }, // 일본
  { name: "d'strict", category: "미디어아트", channelId: "UC9NTI-FPKhzb_OYBwgbv3kw" }, // 대한민국
  { name: "Lampers", category: "미디어아트", channelId: "UCeLH31l_NiejEVn_bRkO-QA" }, // 대한민국
  { name: "Easywith", category: "미디어아트", vimeo: "easywith" }, // 대한민국
  { name: "Universal Everything", category: "미디어아트", vimeo: "universaleverything" }, // 영국
  { name: "NONOTAK STUDIO", category: "미디어아트", vimeo: "nonotak" }, // 프랑스

  // 뮤직비디오 프로덕션
  { name: "Partizan", category: "뮤직비디오 프로덕션", youtube: "@PartizanOfficial" }, // 프랑스/전세계

  // 테크/IT 기업 — 브랜드 필름 퀄리티가 꾸준히 검증된 Apple만 유지
  // (Google·Microsoft·Samsung은 일반 제품/기업 광고 위주라 디자인 레퍼런스로 부적합해 제외)
  { name: "Apple", category: "테크 기업", youtube: "@Apple" } // 미국
];
