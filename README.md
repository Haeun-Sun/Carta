# CARTA — 영상 레퍼런스 큐레이션 보드

전세계 최상위 티어 스튜디오의 고퀄리티 영상 레퍼런스를 자동으로 모아 GIF 썸네일과
함께 균일한 사이즈의 그리드 보드로 보여주는 사이트입니다. 하루 1회 자동 수집,
실행마다 최대 5개(`MAX_PER_RUN`)까지 큐레이션됩니다.

## 구조

```
[수집 소스 — 전부 "신뢰 소스", AI 게이트 없이 통과]
scripts/lib/studios.mjs (스튜디오 화이트리스트) ──▶ YouTube/Vimeo 채널별 "최신작+역대 인기작"
Vimeo Staff Picks 채널 (에디터 큐레이션)        ──▶ "최신+역대 인기"
큐레이션 매체 RSS(Motionographer/The FWA)      ──▶ 본문의 Vimeo/YouTube 링크 추출

                ↓ URL 중복 제거 → 쇼츠 제외 → 랭킹(최신성+인기도) → 최대 N개
        ┬─▶ yt-dlp+ffmpeg로 GIF 생성 → Storage 업로드 ┐
        └─▶ 원본 설명을 코멘트로 사용 ──────────────────┼─▶ Supabase 저장
                                                       ┘
index.html / app.js  →  Supabase를 읽어 균일한 사이즈의 그리드 보드로 렌더링
```

- **프론트엔드**: 순수 HTML/CSS/JS, CSS Grid로 만든 균일한 사이즈의 정렬된 보드
- **수집 소스 3가지 (전부 신뢰 소스, 키워드 검색은 쓰지 않음)**:
  1. `scripts/lib/studios.mjs`에 등록된 스튜디오/기업의 공식 채널
  2. **Vimeo Staff Picks** — Vimeo 에디터팀이 매일 엄선하는 공식 채널
  3. **큐레이션 매체 RSS** — Motionographer / The FWA 게시글 본문의 Vimeo/YouTube 링크
- **AI 분석 없음**: 예전에는 AI가 코멘트/키워드/퀄리티 점수를 생성했지만, 지금은
  원본 영상 설명(description)을 그대로 잘라서 코멘트로 사용합니다. 수집 소스가
  전부 신뢰 소스라 별도 AI 퀄리티 게이트가 필요 없기 때문입니다.
- **쇼츠 제외**: 60초 미만 또는 `#shorts` 태그가 붙은 영상은 자동 제외
- **자동 수집**: `scripts/collect.mjs` — GitHub Actions가 매일 1회 호출, 실행마다 최대 5개(`MAX_PER_RUN`)까지 큐레이션
- **GIF 썸네일**: `scripts/lib/gif.mjs` — yt-dlp로 영상 앞부분 3초를 받아 ffmpeg로 GIF 변환 후 Supabase Storage에 업로드. 실패하면 원본 정지 썸네일로 대체됩니다.
- **카드 정보 순서**: 제목(1줄, 넘치면 말줄임) → 제작 스튜디오(못 찾으면 공백) → 분류/키워드 → 코멘트
- **카드 클릭 시 팝업 재생**: 새 탭으로 이동하지 않고 사이트 안에서 바로 영상이 재생됩니다
- **관리자 삭제**: 로그인 없이 비밀번호 함수로 구현 (우상단 아이콘 버튼)
- **DB**: Supabase(Postgres) `references` 테이블 + `thumbnails` Storage 버킷

### 스튜디오 화이트리스트를 더 넓히고 싶다면
`scripts/lib/studios.mjs` 파일 하나만 수정하면 됩니다. 각 항목은 이런 형태예요:
```js
{ name: "BUCK", category: "모션그래픽 스튜디오", vimeo: "buck" }
{ name: "Apple", category: "테크 기업", youtube: "@Apple" }
{ name: "teamLab", category: "미디어아트", channelId: "UC..." } // 핸들이 불안정할 때
```
채널 핸들이 바뀌었거나 틀려도 프로그램이 죽지 않고 그 항목만 조용히 건너뜁니다
(실행 로그에 "채널을 찾을 수 없어 건너뜁니다" 식으로 표시됨).

추가 전 반드시 웹에서 실제 채널이 있는지, 업로드 콘텐츠가 있는지 확인하세요.
키워드 검색으로 화이트리스트를 대체하는 방향은 과거에 저퀄리티 영상이 섞여 들어와
명시적으로 폐기했습니다.

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

### 3. 프론트엔드 설정
`config.js`에 Supabase `URL`과 **anon public** 키를 입력하세요. (service_role 키는 절대 넣지 마세요)

### 4. 정적 페이지 배포
`index.html`, `style.css`, `app.js`, `config.js` 4개 파일을 GitHub Pages, Vercel,
Netlify 등 아무 곳에나 올리면 됩니다.

### 5. 자동 수집 활성화 (GitHub Actions)
1. 리포지토리 Settings → Secrets and variables → Actions에 등록:
   `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `YOUTUBE_API_KEY`, `VIMEO_ACCESS_TOKEN`
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
- 수집 대상 스튜디오/기업 목록: `scripts/lib/studios.mjs`
- 랭킹 가중치(최신성/인기도): `scripts/lib/ranking.mjs`
- 쇼츠 판별 기준(초 단위): `scripts/lib/youtube.mjs`, `scripts/lib/vimeo.mjs`의 `isLikelyShort`
- GIF 길이/화질: `scripts/lib/gif.mjs`의 `--download-sections`, `scale` 값
- 폰트/색상/보드 그리드: `style.css` 상단 `:root` 변수 및 `.board` 규칙
