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

  // 모션그래픽 스튜디오 — 레퍼런스 라이브러리(F:\001_레퍼런스영상) 기반 추가 (2026-07-09)
  { name: "Imaginary Forces", category: "모션그래픽 스튜디오", vimeo: "imaginaryforces" }, // 미국, LA (타이틀 디자인)
  { name: "We Are Royale", category: "모션그래픽 스튜디오", vimeo: "weareroyale" }, // 미국, LA
  { name: "Bito", category: "모션그래픽 스튜디오", vimeo: "bitostudio" }, // 대만, 타이베이
  { name: "Aixsponza", category: "모션그래픽 스튜디오", vimeo: "aixsponza" }, // 독일, 뮌헨
  { name: "Yambo Studio", category: "모션그래픽 스튜디오", vimeo: "yambo" }, // 독일, 베를린
  { name: "Six N. Five", category: "모션그래픽 스튜디오", vimeo: "user37313853" }, // 스페인, 바르셀로나
  { name: "Le Cube", category: "모션그래픽 스튜디오", vimeo: "lecubetv" }, // 아르헨티나/스페인
  { name: "Roof Studio", category: "모션그래픽 스튜디오", vimeo: "roofstudio" }, // 미국, 뉴욕
  { name: "Undesigned Museum", category: "모션그래픽 스튜디오", vimeo: "undesignedmuseum" }, // 대한민국, 서울
  { name: "Woot Creative", category: "모션그래픽 스튜디오", vimeo: "wootcreative" }, // 대한민국, 서울
  { name: "Delpic", category: "모션그래픽 스튜디오", vimeo: "delpic" }, // 대한민국, 서울
  { name: "Not Real", category: "모션그래픽 스튜디오", vimeo: "notreal" }, // 아르헨티나/스페인
  { name: "Koi Factory", category: "모션그래픽 스튜디오", vimeo: "koifactory" }, // 브라질/미국
  { name: "Yeti Pictures", category: "모션그래픽 스튜디오", vimeo: "yetipictures" }, // 그리스, 아테네
  { name: "Petrick", category: "모션그래픽 스튜디오", vimeo: "petrickanimation" }, // 조지아
  { name: "Buda.tv", category: "모션그래픽 스튜디오", vimeo: "budatv" }, // 아르헨티나 (독립 스튜디오로 유지 중 확인)
  { name: "Cobb", category: "모션그래픽 스튜디오", vimeo: "cobbtv" }, // 대한민국, 서울
  { name: "Already Been Chewed", category: "모션그래픽 스튜디오", vimeo: "alreadybeenchewed" }, // 미국, 텍사스
  { name: "Panoply", category: "모션그래픽 스튜디오", vimeo: "panoply" }, // 영국, 런던
  { name: "Vucko", category: "모션그래픽 스튜디오", vimeo: "vucko" }, // 캐나다, 토론토
  { name: "Parallel Studio", category: "모션그래픽 스튜디오", vimeo: "parallelstudioparis" }, // 프랑스, 파리
  { name: "Clim Studio", category: "모션그래픽 스튜디오", vimeo: "clim" }, // 스페인, 바르셀로나
  { name: "Ditroit", category: "모션그래픽 스튜디오", vimeo: "ditroit" }, // 이탈리아, 밀라노
  { name: "Flatwhite Motion", category: "모션그래픽 스튜디오", vimeo: "flatwhitemotion" }, // 호주/중국
  { name: "Computerface", category: "모션그래픽 스튜디오", vimeo: "computerface" }, // 대만, 타이베이
  { name: "Plenty", category: "모션그래픽 스튜디오", vimeo: "plenty" }, // 아르헨티나, 부에노스아이레스
  { name: "UoU", category: "모션그래픽 스튜디오", vimeo: "uou" }, // 중국, 상하이

  // VFX 스튜디오 — 전세계
  { name: "The Mill", category: "VFX 스튜디오", vimeo: "themill" }, // 영국/미국
  { name: "Framestore", category: "VFX 스튜디오", vimeo: "framestore" }, // 영국
  { name: "Blur Studio", category: "VFX 스튜디오", youtube: "@BlurStudio" }, // 미국
  { name: "Industrial Light & Magic", category: "VFX 스튜디오", youtube: "@InsideILM" }, // 미국
  { name: "Sehsucht", category: "VFX 스튜디오", vimeo: "sehsucht" }, // 독일
  { name: "Ars Thanea", category: "VFX 스튜디오", vimeo: "arsthanea" }, // 폴란드
  { name: "Territory Studio", category: "VFX 스튜디오", vimeo: "territorystudio" }, // 영국

  // VFX 스튜디오 — 레퍼런스 라이브러리 기반 추가 (2026-07-09)
  { name: "Carbon", category: "VFX 스튜디오", vimeo: "heycarbon" }, // 미국, 뉴욕
  { name: "Unit Image", category: "VFX 스튜디오", vimeo: "user7515497" }, // 프랑스, 파리
  { name: "Giantstep", category: "VFX 스튜디오", channelId: "UCb4M2urANsFFJMhAjZpMb-g" }, // 대한민국, 서울 (핸들 충돌로 channelId 사용)
  { name: "CHRLX", category: "VFX 스튜디오", vimeo: "chrlx" }, // 미국, 뉴욕
  { name: "Zombie Studio", category: "VFX 스튜디오", vimeo: "user12341992" }, // 브라질, 상파울루

  // 애니메이션 스튜디오
  // (Pixar·Disney·Sony·Netflix처럼 영화 트레일러만 올리는 채널은 "디자인 레퍼런스"가
  //  아니라 콘텐츠 홍보물이라 제외함. 공정/아트하우스 성격이 강한 곳만 유지)
  { name: "Cartoon Saloon", category: "애니메이션 스튜디오", youtube: "@CartoonSaloonStudio" }, // 아일랜드 (아트하우스)
  { name: "Passion Pictures", category: "애니메이션 스튜디오", vimeo: "passionpictures" }, // 영국

  // 애니메이션 스튜디오 — 레퍼런스 라이브러리 기반 추가 (2026-07-09)
  { name: "The Line", category: "애니메이션 스튜디오", youtube: "@THELINEanimation" }, // 영국, 런던
  { name: "Hornet", category: "애니메이션 스튜디오", vimeo: "hellohornet" }, // 미국, 뉴욕
  { name: "Polyester Studio", category: "애니메이션 스튜디오", vimeo: "polyester" }, // 캐나다, 토론토
  { name: "Never Sit Still", category: "애니메이션 스튜디오", vimeo: "neversitstill" }, // 호주, 시드니
  { name: "Studio Nuts", category: "애니메이션 스튜디오", vimeo: "studionuts" }, // 대한민국, 서울

  // 미디어아트
  { name: "teamLab", category: "미디어아트", channelId: "UCYab90rmhVPfbrnmN-Zmwhg" }, // 일본
  { name: "d'strict", category: "미디어아트", channelId: "UC9NTI-FPKhzb_OYBwgbv3kw" }, // 대한민국
  { name: "Lampers", category: "미디어아트", channelId: "UCeLH31l_NiejEVn_bRkO-QA" }, // 대한민국
  { name: "Easywith", category: "미디어아트", vimeo: "easywith" }, // 대한민국
  { name: "Universal Everything", category: "미디어아트", vimeo: "universaleverything" }, // 영국
  { name: "NONOTAK STUDIO", category: "미디어아트", vimeo: "nonotak" } // 프랑스

  // 제외됨(사용자 요청, 2026-07-09): Apple(테크 기업), LAIKA(애니메이션),
  // Partizan(뮤직비디오 프로덕션) — 수집 대상에서 뺌
];
