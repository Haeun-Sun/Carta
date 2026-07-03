# CARTA — 영상 레퍼런스 큐레이션 보드

전세계 어디서 만든 영상이든, 실제로 퀄리티가 높은 모션그래픽·VFX·애니메이션·
뮤직비디오·브랜드 필름만 자동으로 모아 GIF 썸네일 + 짧은 코멘트로 보여주는
보드형 사이트입니다. 하루 1개 제한 없이, 실행할 때마다 여러 개가 쌓입니다.

## 구조

```
[신뢰 소스 — 게이트 없이 바로 통과]
scripts/lib/studios.mjs (스튜디오 화이트리스트) ──▶ YouTube/Vimeo 채널별 최신 업로드
Vimeo Staff Picks 채널 (에디터 큐레이션)        ──▶ 이미 검증된 영상

[화이트리스트 밖 — AI 퀄리티 게이트 필요]
전세계 대상 키워드 검색(영문+한글) ──▶ AI가 1~10점 퀄리티 채점 ──▶ 기준 미달 시 제외

                ↓ (신뢰 소스 + 게이트 통과분 합산)
        쇼츠 제외 → 랭킹(최신순+반응) → 최대 N개 선택
                ↓
        ┬─▶ yt-dlp+ffmpeg로 GIF 생성 → Storage 업로드 ┐
        └─▶ AI로 코멘트+키워드+분류 생성 ──────────────┼─▶ Supabase 저장
                                                       ┘
index.html / app.js  →  Supabase를 읽어 균일한 사이즈의 그리드 보드로 렌더링
```

- **프론트엔드**: 순수 HTML/CSS/JS, CSS Grid로 만든 균일한 사이즈의 정렬된 보드
- **수집 소스 4가지**:
  1. `scripts/lib/studios.mjs`에 등록된 스튜디오/기업의 공식 채널 (신뢰 소스)
  2. **Vimeo Staff Picks** — Vimeo 에디터팀이 매일 엄선하는 공식 채널 (신뢰 소스, 화이트리스트에 없는 전세계 작업물의 주 통로)
  3. 전세계 대상 영문+한글 키워드 검색 (예: "모션그래픽 릴", "VFX breakdown") — **AI 퀄리티 게이트 필수**
  4. `scripts/manual-add.mjs`로 직접 추가하는 수동 큐레이션
- **AI 퀄리티 게이트**: 3번 소스는 AI가 제목·썸네일을 보고 "제작 퀄리티"를 10점 만점으로 채점(인기도 아님) 후, `QUALITY_THRESHOLD`(기본 6점) 미만이면 자동 제외. 신뢰 소스(1, 2번)는 이 게이트를 건너뜁니다.
- **쇼츠 제외**: 60초 미만 또는 `#shorts` 태그가 붙은 영상은 자동 제외
- **자동 수집**: `scripts/collect.mjs` — GitHub Actions가 매일 1회 호출, 실행마다 최대 5개(`MAX_PER_RUN`)까지 큐레이션
- **GIF 썸네일**: `scripts/lib/gif.mjs` — yt-dlp로 영상 앞부분 3초를 받아 ffmpeg로 GIF 변환 후 Supabase Storage에 업로드. 실패하면 원본 정지 썸네일로 대체됩니다.
- **AI 코멘트+키워드+분류**: 제목·제작자·썸네일을 보고 1~2문장 코멘트, 키워드 태그 2~4개, (화이트리스트 밖이면) 분류까지 생성
- **카드 정보 순서**: 제목(1줄, 넘치면 말줄임) → 제작 스튜디오(못 찾으면 공백) → 분류/키워드 → 코멘트
- **DB**: Supabase(Postgres) `references` 테이블 + `thumbnails` Storage 버킷

### 스튜디오 화이트리스트를 더 넓히고 싶다면
`scripts/lib/studios.mjs` 파일 하나만 수정하면 됩니다. 각 항목은 이런 형태예요:
```js
{ name: "BUCK", category: "모션그래픽 스튜디오", vimeo: "buck" }
{ name: "Apple", category: "테크 기업", youtube: "@Apple" }
```
채널 핸들이 바뀌었거나 틀려도 프로그램이 죽지 않고 그 항목만 조용히 건너뜁니다
(실행 로그에 "채널을 찾을 수 없어 건너뜁니다" 식으로 표시됨).

다만 화이트리스트는 어디까지나 "보장된 소스"일 뿐, 실제 발견 폭은 **Vimeo Staff Picks +
AI 퀄리티 게이트**가 담당합니다. 특정 스튜디오를 못 찾았다고 해서 그 스튜디오의 작업물이
아예 안 뜨는 건 아니에요 — 검색 키워드에 걸리고 AI 채점을 통과하면 자동으로 들어옵니다.

> **참고**: `OPENAI_API_KEY`/`ANTHROPIC_API_KEY`를 둘 다 등록하지 않고 운영하는 경우
> (돈을 안 쓰고 싶은 경우), AI 퀄리티 채점 자체가 불가능해지므로 전세계 키워드 검색
> 결과는 게이트 없이 전부 통과합니다. 이 경우 화질(HD 이상)·길이 필터만 적용되고,
> "진짜 고퀄리티"까지는 걸러내지 못한다는 점을 감안해주세요. 신뢰 소스(스튜디오
> 화이트리스트 + Vimeo Staff Picks)만으로 운영하고 싶다면 `scripts/lib/collect.mjs`에서
> `fetchGlobalSearchCandidates` 호출 줄을 지우면 됩니다.

### Behance/Dribbble
공개 검색 API가 막혀 있어 자동 수집에서 제외했습니다. `scripts/manual-add.mjs`로 직접
추가하면 됩니다 (이 경우 GIF는 자동 생성되지 않고, `--thumbnail`로 넘긴 정지 이미지가 그대로 쓰입니다).

## 배포 순서

### 1. Supabase 프로젝트 생성
1. https://supabase.com 에서 새 프로젝트 생성
2. SQL Editor에서 `supabase/schema.sql` 실행
3. 왼쪽 메뉴 **Storage** → **New bucket** → 이름 `thumbnails` → **Public bucket** 체크 후 생성
   (스크립트가 최초 실행 시 자동 생성도 시도하지만, 미리 만들어두면 더 안전합니다)
4. Project Settings → API에서 `URL`, `anon public key`, `service_role key` 복사

### 2. API 키 준비
- **YouTube Data API v3**: Google Cloud Console → API 사용 설정 → API 키 발급
- **Vimeo**: https://developer.vimeo.com 앱 생성 후 Access Token 발급 (Scope: `public`)
- **AI 설명 생성 (선택, 둘 중 하나만 있으면 됨)**:
  - 이미 ChatGPT Plus 등 OpenAI 유료 결제 중이라면 → https://platform.openai.com/api-keys 에서 **OpenAI API 키** 발급 (참고: OpenAI 구독료와 API 사용료는 별도 과금입니다)
  - Claude를 쓰고 싶다면 → https://console.anthropic.com 에서 **Anthropic API 키** 발급
  - **결제 등록이 둘 다 부담스럽다면 생략해도 됩니다** — 키가 없으면 AI가 설명을 만드는 대신, 원본 영상 설명을 그대로 짧게 잘라서 보여줍니다. 사이트는 정상 작동해요.
  - 둘 다 등록하면 **OpenAI(GPT)가 우선 사용**됩니다.

### 3. 프론트엔드 설정
`config.js`에 Supabase `URL`과 **anon public** 키를 입력하세요. (service_role 키는 절대 넣지 마세요)

### 4. 정적 페이지 배포
`index.html`, `style.css`, `app.js`, `config.js` 4개 파일을 GitHub Pages, Vercel,
Netlify 등 아무 곳에나 올리면 됩니다.

### 5. 자동 수집 활성화 (GitHub Actions)
1. 리포지토리 Settings → Secrets and variables → Actions에 등록:
   `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `YOUTUBE_API_KEY`, `VIMEO_ACCESS_TOKEN`
   `OPENAI_API_KEY` 또는 `ANTHROPIC_API_KEY` (선택, 둘 중 하나만 — 둘 다 등록 안 하면 원본 설명이 표시됩니다)
2. `.github/workflows/daily-archive.yml`이 매일 UTC 21:00(한국시간 06:00)에 실행됩니다.
   Actions 탭 → **Run workflow**로 즉시 테스트할 수 있습니다.

### 6. 로컬 테스트
```bash
npm install
cp .env.example .env
node --env-file=.env scripts/collect.mjs
```
로컬에서 GIF 생성을 테스트하려면 `yt-dlp`와 `ffmpeg`가 컴퓨터에 설치되어 있어야 합니다.
(`brew install yt-dlp ffmpeg` 또는 `pip install yt-dlp` + OS별 ffmpeg 설치)

## 커스터마이징
- 한 번 실행할 때 몇 개까지 큐레이션할지: `collect.mjs`의 `MAX_PER_RUN` (기본 5)
- AI 퀄리티 통과 기준(10점 만점): `.env`의 `QUALITY_THRESHOLD` (기본 6) — 낮출수록 더 많이, 관대하게 통과
- 수집 대상 스튜디오/기업 목록: `scripts/lib/studios.mjs`
- 전세계 검색 키워드: `scripts/lib/youtube.mjs`의 `GLOBAL_SEARCH_TERMS`
- 랭킹 가중치: `scripts/lib/ranking.mjs`
- 쇼츠 판별 기준(초 단위): `scripts/lib/youtube.mjs`, `scripts/lib/vimeo.mjs`의 `isLikelyShort`
- GIF 길이/화질: `scripts/lib/gif.mjs`의 `--download-sections`, `scale` 값
- AI 코멘트/키워드/퀄리티 채점 프롬프트: `scripts/lib/analyze.mjs`의 `SYSTEM_PROMPT`
- 폰트/색상/보드 그리드: `style.css` 상단 `:root` 변수 및 `.board` 규칙
