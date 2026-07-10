# CLAUDE.md — CARTA 프로젝트 안내 (Claude Code용)

이 파일은 Claude Code가 세션을 시작할 때마다 먼저 읽는 온보딩 문서입니다.
프로젝트의 목적, 구조, 지금까지 내린 결정과 그 이유, 배포 규칙, 함정들을 정리했습니다.

> 사용자는 코딩 비전공자입니다. 설명은 쉬운 한국어로, 전문 용어는 풀어서 해주세요.
> 터미널 명령이나 파일 수정을 제안할 때는 "무엇을/왜" 하는지 먼저 한 줄로 알려주세요.

---

## 1. 프로젝트 개요

**CARTA** — 전세계 최상위 티어 스튜디오의 고퀄리티 영상 레퍼런스를 자동으로 모아
GIF 썸네일 + AI 코멘트 + 키워드와 함께 보드형 그리드로 보여주는 사이트.

- 대상: 모션그래픽 / VFX / 애니메이션 / 미디어아트 / 뮤직비디오 / 브랜드 필름
- 하루 1회 자동 수집, 실행마다 최대 5개(`MAX_PER_RUN`)까지 큐레이션
- 라이브 사이트: `carta-haeunsun.vercel.app`
- GitHub 저장소: `Haeun-Sun/Carta`

---

## 2. 기술 스택 & 아키텍처

순수 정적 프론트엔드 + Node 스크립트(자동 수집) + Supabase(DB/스토리지) 조합.
빌드 도구·프레임워크 없음. 프론트엔드는 그냥 정적 파일.

```
[수집 소스 — 전부 "신뢰 소스", AI 게이트 없이 통과]
스튜디오 화이트리스트(studios.mjs)  → YouTube/Vimeo 채널별 "최신작+역대 인기작"
Vimeo Staff Picks                   → 에디터 큐레이션 "최신+역대 인기"
큐레이션 매체 RSS(Motionographer/FWA) → 본문의 Vimeo/YouTube 링크 추출

        ↓ URL 중복 제거 → 쇼츠 제외 → 랭킹(최신성+인기도) → 최대 N개
        → yt-dlp+ffmpeg로 앞 3초 GIF 생성 → Supabase Storage 업로드
        → Supabase `references` 테이블에 저장 (코멘트는 원본 설명을 그대로 사용)

index.html + app.js → Supabase 읽어서 CSS Grid 보드로 렌더링
```

### 파일 구조
- `index.html` / `style.css` / `app.js` — 프론트엔드 (보드 렌더링 + 관리자 삭제 UI)
- `config.js` — Supabase URL + anon(publishable) key. **공개돼도 되는 값만** 넣음.
- `scripts/collect.mjs` — 자동 수집 파이프라인 진입점
- `scripts/manual-add.mjs` — 수동으로 레퍼런스 1개 추가하는 CLI
- `scripts/lib/studios.mjs` — **스튜디오 화이트리스트 (가장 자주 수정하는 파일)**
- `scripts/lib/youtube.mjs` — YouTube 채널 수집 (핸들 또는 channelId 지원)
- `scripts/lib/vimeo.mjs` — Vimeo 사용자 채널 + Staff Picks 수집
- `scripts/lib/feeds.mjs` — Motionographer/The FWA RSS 파싱 (라이브러리 없이 정규식)
- `scripts/lib/ranking.mjs` — 최신성+인기도 가중합 점수
- `scripts/lib/gif.mjs` — yt-dlp+ffmpeg로 GIF 생성 후 Storage 업로드
- `scripts/lib/supabase.mjs` — service_role 클라이언트
- `supabase/schema.sql` — `references` 테이블 스키마
- `supabase/admin.sql` — 관리자 삭제용 비밀번호 함수
- `.github/workflows/daily-archive.yml` — 매일 자동 실행 (cron)

---

## 3. 지금까지 내린 핵심 결정 (그리고 이유)

작업할 때 이 결정들을 뒤집지 마세요. 사용자가 오래 고민해서 정한 방향입니다.

1. **전세계 키워드 검색은 제거했다.** 예전에 "motion graphics reel" 같은 키워드로
   유튜브 전체를 검색했는데, 아무나 올린 저퀄 영상이 섞여 들어와서 퀄리티가 나빴음.
   지금은 **검증된 신뢰 소스 3개(화이트리스트 + Staff Picks + 큐레이션 RSS)만** 사용.
   → 다시 키워드 검색을 추가하자는 방향은 사용자가 명시적으로 거부했음.

2. **화이트리스트는 "BUCK·Tendril 티어"가 기준.** STASH/Motionographer/Vimeo
   Staff Picks 같은 업계 큐레이션에 반복 등장 + 공식 채널 실재 확인된 곳만 넣음.
   스튜디오 추가 요청이 오면 **반드시 웹에서 실제 채널이 있는지, 업로드 콘텐츠가
   있는지 확인한 뒤** 넣을 것. (과거에 UVA를 넣었다가 "no videos"라 뺀 적 있음)

3. **최신작뿐 아니라 예전 명작도 올라와야 한다.** 각 소스에서 "최신순"과
   "역대 인기순(조회수)"을 둘 다 가져옴. 랭킹도 최신성 급감 대신 30일에 걸쳐
   완만히 감소 + 인기도 비중을 키워서, 오래된 대표작도 경쟁 가능하게 조정함.

   **3-1. 디자인 레퍼런스가 안 모이던 문제 수정 (2026-07-08).** 보드가 Netflix
   예고편·Pixar 트레일러·테크 기업 광고로 도배되고 정작 BUCK·Tendril 같은 디자인
   스튜디오 작업이 안 뜨던 문제를 3가지로 고침:
   - **화이트리스트에서 트레일러/광고 채널 제거** — Netflix, Pixar, Disney Animation,
     Sony Pictures Animation(영화 트레일러 전용), Google·Microsoft·Samsung(제품/기업
     광고 위주)을 뺌. 이들은 "디자인 레퍼런스"가 아니라 콘텐츠 홍보물인데 조회수·업로드
     빈도가 압도적이라 디자인 스튜디오를 밀어냈음. Apple(브랜드 필름 퀄리티)과
     LAIKA·Cartoon Saloon(공정/아트하우스)은 디자인 관련성이 있어 유지. (47곳 → 40곳)
   - **조회수 플랫폼 정규화** (`ranking.mjs`의 `PLATFORM_BASELINE`) — 유튜브 조회수와
     Vimeo 재생수는 규모가 달라 그냥 비교하면 유튜브가 항상 이김. "그 플랫폼 기준으로
     얼마나 인기 있나"로 환산해 Vimeo 디자인 명작도 동등하게 경쟁하게 함.
   - **채널당 1개 제한** (`collect.mjs`의 `usedKeys`) — 한 실행에서 한 스튜디오/소스는
     최대 1칸만. 한 채널이 5칸을 독점하지 못하게 강제로 다양화.
   → 이 방향(디자인 중심, 트레일러/광고 배제)은 사용자가 명시적으로 선택했음.

   **3-2. 레퍼런스 라이브러리 기반 화이트리스트 확장 (2026-07-09).** 사용자의 로컬
   레퍼런스 폴더(`F:\001_레퍼런스영상`, 영상 4,000여 개)를 "퀄리티 기준"으로 삼음.
   파일명이 `분류_스튜디오_프로젝트` 규칙이라 스튜디오명을 빈도순으로 추출 → 사용자가
   인정하는 퀄리티의 스튜디오 목록을 도출 → 화이트리스트에 없던 곳들의 공식 채널을
   웹 검증 후 37곳 추가함 (40곳 → 77곳). 예: Imaginary Forces, Carbon, Hornet, The Line,
   Aixsponza, Unit Image, Six N. Five, Roof Studio, Undesigned Museum, Woot, Delpic,
   Giantstep, Bito, Not Real, Zombie Studio 등. Buda.tv는 "Psyop에 흡수됐다"던 과거
   정보가 틀렸음이 확인돼(독립 유지) 다시 추가함.
   → **핵심 교훈: "퀄리티 기준"은 AI 화질 분석이 아니라 "신뢰 스튜디오 목록"으로 구현됨.**
   자동 수집은 클라우드(GitHub Actions)에서 돌아 로컬 F드라이브에 접근 불가하고 AI 분석도
   제거됐으므로, 퀄리티 통제 수단은 오직 화이트리스트뿐. 레퍼런스 폴더는 이 화이트리스트를
   보정하는 근거로 활용.
   - **검증 후 제외한 후보**: Logan(공식 채널 확인 실패), Ollie Studio(영상 채널 없음),
     Seenvision(서울 vs 베이징 동명 충돌), Willo·Rocketpanda·ZHEESHEE(정체/국적 불확실).

4. **쇼츠는 제외.** 60초 미만 또는 `#shorts` 태그가 붙은 영상은 자동 필터링.

5. **카드 정보 순서(고정):** 제목(1줄, 넘치면 말줄임) → 제작 스튜디오(없으면 공백)
   → 분류/키워드 → 코멘트. 보드는 masonry가 아니라 **균일한 사이즈의 CSS Grid**.

6. **AI 코멘트/키워드/퀄리티 분석 기능은 2026-07-07에 완전히 제거함.** 원래
   OpenAI(gpt-4o-mini) 우선, 없으면 Anthropic으로 코멘트·키워드·와우포인트를
   생성했었는데, 사용자가 GPT API 사용을 원치 않아 `scripts/lib/analyze.mjs`를
   삭제하고 `collect.mjs`에서 관련 호출을 모두 제거함. 카드 코멘트는 이제
   원본 영상 설명(description)을 그대로(120자까지) 잘라서 사용하고, 키워드는
   비워둠. → **다시 AI 분석을 붙이자는 방향은 사용자가 명시적으로 거부했음.**

7. **관리자 삭제 기능.** 로그인 시스템 없이 Supabase의 비밀번호 보호 함수
   (`verify_admin_password`, `delete_reference`)로 구현. 사이트 우상단 "관리자"
   버튼 → 비밀번호 → 카드마다 ✕ 버튼. 비밀번호는 `admin.sql`에 설정.

---

## 4. 배포 규칙 (중요)

- **수집 로직 변경(스튜디오 추가 등) = GitHub만 바꾸면 됨.** Supabase/Vercel 안 건드림.
- **DB 컬럼이 바뀔 때만** Supabase SQL Editor에서 `alter table` 실행 필요.
- 프론트엔드(index/style/app) 변경도 GitHub push하면 Vercel이 자동 재배포.
- 변경 후 확인: GitHub → Actions 탭 → "Curate references" → Run workflow (즉시 실행),
  또는 매일 한국시간 오전 6시(cron `0 21 * * *`, UTC 기준) 자동 실행.

### 코드 수정 후 항상 할 것
```bash
# 모든 스크립트 문법 검사
for f in scripts/collect.mjs scripts/manual-add.mjs scripts/lib/*.mjs app.js; do
  node --check "$f" || echo "FAIL $f"
done
```
그다음 git add/commit/push. (사용자에게 커밋 메시지 보여주고 승인받은 뒤 push)

---

## 5. 함정 (과거에 실제로 터진 문제들)

- **Node 버전은 반드시 22 이상.** Node 20은 `@supabase/supabase-js`가
  "Node.js 20 detected without native WebSocket support" 에러를 냄.
  `.github/workflows/daily-archive.yml`에 `node-version: 22`로 지정돼 있음.
- **폴더 두 겹 주의.** 예전에 저장소에 `motion-archive-html (1)/motion-archive-html/`
  식으로 중첩돼서 Vercel 404, Actions 경로 오류가 남. 지금은 저장소 루트에 파일이
  바로 있는 구조. 이 구조를 유지할 것.
- **YouTube API 할당량.** 채널당 검색 2회(최신+인기) × 100 units. 현재 YouTube/channelId
  방식 채널 약 16곳이라 하루 3,200 units 정도(무료 한도 10,000). 채널을 대량 추가하면
  할당량을 초과할 수 있으니 주의.
- **핸들이 불확실한 YouTube 채널은 channelId를 직접 지정.** `studios.mjs`에서
  `{ name, category, channelId: "UC..." }` 형태 지원 (2026-07-06에 `youtube.mjs`에
  실제로 구현함 — 그 전엔 문서에만 있고 코드엔 없었음). teamLab, d'strict, Lampers가
  이 방식으로 들어가 있음. Easywith는 공식 Vimeo 채널(`vimeo.com/easywith`)이 확인돼서
  vimeo 방식으로 등록함.
- **RSS의 The FWA는 피드 경로가 불안정.** 실패해도 전체가 멈추지 않게 예외 처리됨.
  로그에 "The FWA 요청 실패"만 뜨고 나머지는 정상 동작.

---

## 6. 자주 하는 작업: 스튜디오 추가

`scripts/lib/studios.mjs`의 `STUDIOS` 배열에 항목 추가. 형식:
```js
{ name: "표시이름", category: "분류", vimeo: "vimeo사용자명" }
{ name: "표시이름", category: "분류", youtube: "@핸들" }
{ name: "표시이름", category: "분류", channelId: "UC로시작하는채널ID" } // 핸들 불확실할 때
```
- 분류 예: "모션그래픽 스튜디오", "VFX 스튜디오", "애니메이션 스튜디오",
  "미디어아트", "뮤직비디오 프로덕션", "테크 기업" 등 (카드 배지로 표시됨)
- **추가 전 반드시 웹 검색으로 채널 실재 + 업로드 콘텐츠 유무 확인.**
- 잘못된 핸들이어도 프로그램은 죽지 않고 해당 항목만 건너뜀(로그 경고).

### 현재 화이트리스트 (총 74곳, 2026-07-09 기준)
> ⚠️ **전체 목록의 기준(source of truth)은 항상 `scripts/lib/studios.mjs`입니다.**
> (과거에 이 문서와 코드가 어긋나 혼동이 있었음 — 개수/목록이 궁금하면 코드를 직접 볼 것.)
> 카테고리별 개수: 모션그래픽 49 · VFX 12 · 애니메이션 7 · 미디어아트 6.
> (뮤직비디오·테크 카테고리는 사용자 요청으로 제거됨 — 아래 제외 목록 참고.)
- 2026-07-09에 레퍼런스 라이브러리 기반으로 37곳을 추가함([3-2 결정](#3-지금까지-내린-핵심-결정-그리고-이유) 참고). 추가분은 studios.mjs에서 "레퍼런스 라이브러리 기반 추가" 주석으로 표시돼 있음.

**제외/보류한 후보 (실재하지만 이유가 있어 뺌, 다시 검토 시 참고):**
- Netflix / Pixar / Disney Animation / Sony Pictures Animation — 영화 트레일러 전용 채널이라
  디자인 레퍼런스가 아님. 조회수·업로드 빈도로 디자인 스튜디오를 밀어내서 2026-07-08 제거
  ([3-1 결정](#3-지금까지-내린-핵심-결정-그리고-이유) 참고).
- Google / Microsoft / Samsung — 일반 제품/기업 광고 위주라 디자인 레퍼런스로 부적합, 같은 날 제거.
- Apple / LAIKA / Partizan(뮤직비디오) — 사용자 요청으로 2026-07-09 수집 대상에서 제외
  (뮤직비디오·테크 카테고리 자체가 없어짐).
- DreamWorks Animation — 유튜브 채널이 여러 개로 파편화(Universal 인수 이후)돼 있어 정확한 대표 채널을 특정 못 함
- Nexus Studios — 유튜브 핸들이 불안정(자동생성 형태)하고 혼동되는 동명 채널 존재 (2026-07-09 재검토했으나 여전히 공식 사이트가 유튜브를 직접 링크 안 해서 보류)
- Blinkink — 실제 영상이 `blinkprods`(Blink 그룹 통합 계정) 안에 있어서, 등록하면 애니메이션 외 실사 광고 영상까지 섞여 들어옴 (현재 코드는 특정 채널만 골라오는 기능이 없음)
- Logan / Ollie Studio — 레퍼런스에 있으나 공식 영상 채널을 확증 못 함 (2026-07-09 검증)
- Seenvision(서울 vs 베이징 동명 충돌) / Willo / Rocketpanda / ZHEESHEE — 채널은 있으나 정체·국적 불확실해 보류
- ~~Buda.tv~~ — "Psyop에 흡수"는 오정보였고 독립 유지 확인돼 2026-07-09 화이트리스트에 추가함

---

## 7. 환경변수 (GitHub Actions Secrets)

자동 수집 스크립트가 쓰는 값들 (GitHub 저장소 Settings → Secrets and variables → Actions):
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — DB 쓰기용
- `YOUTUBE_API_KEY` — YouTube Data API v3
- `VIMEO_ACCESS_TOKEN` — Vimeo API (Unauthenticated/public 스코프)

옵션: `MAX_PER_RUN`(기본 5)

`OPENAI_API_KEY`/`ANTHROPIC_API_KEY`는 더 이상 쓰지 않음 (2026-07-07 AI 분석 기능
제거, [6번 결정](#3-지금까지-내린-핵심-결정-그리고-이유) 참고). GitHub Secrets에
값이 남아있어도 무해하지만, 정리하고 싶다면 삭제해도 됩니다.

프론트엔드 `config.js`에는 공개용 anon key만. service_role 키는 절대 넣지 말 것.
