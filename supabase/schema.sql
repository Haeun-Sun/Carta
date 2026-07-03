-- Supabase SQL Editor에서 그대로 실행하세요.
-- 이전 버전과 달리 "하루 1개" 제약이 없습니다. 실행할 때마다 여러 개가 쌓일 수 있습니다.

create table if not exists public.references (
  id uuid primary key default gen_random_uuid(),
  source text not null,                  -- 'youtube' | 'vimeo' | 'manual'
  source_url text not null unique,       -- 같은 영상 중복 저장 방지
  title text not null,
  author text,                           -- 제작 스튜디오/기업명 (못 찾으면 비워둠)
  category text,                         -- 수집 기준 분류 (예: '모션그래픽 스튜디오', 'VFX 스튜디오')
  thumbnail_url text,                    -- 생성된 GIF 썸네일의 공개 URL
  description text,                      -- AI가 정리한 짧은 코멘트
  keywords text[],                       -- AI가 뽑은 키워드 태그 (예: {타이포그래피,3D 캐릭터})
  published_at timestamptz,              -- 원본 게시일 (랭킹에 사용)
  score numeric,                         -- 수집 시점의 랭킹 점수 (참고용)
  created_at timestamptz not null default now()
);

create index if not exists references_created_at_idx on public.references (created_at desc);

alter table public.references enable row level security;

create policy "public read" on public.references
  for select using (true);

-- insert/update/delete는 service_role 키로만 서버(스크립트)에서 수행합니다.

-- ────────────────────────────────────────────────────────────────
-- 이미 테이블을 만들어서 쓰고 계셨다면, 위 CREATE TABLE은 아무 효과가
-- 없습니다(이미 존재하므로). 대신 아래 두 줄만 SQL Editor에서 실행해서
-- 새 컬럼만 추가하세요:
--
-- alter table public.references add column if not exists category text;
-- alter table public.references add column if not exists keywords text[];
-- ────────────────────────────────────────────────────────────────
