-- 관리자가 삭제한 영상을 "다시 수집하지 않도록" 차단 목록에 기록하는 기능입니다.
-- Supabase SQL Editor에 그대로 붙여 한 번 실행하세요.
--
-- 배경: 수집은 "지금 DB에 없는 것만 새로 담는" 방식이라, 관리자가 어떤 영상을 삭제하면
-- 다음 실행 때 그 채널에서 다시 발견해 재수집됩니다(예: d'strict의 Wave가 계속 부활).
-- 삭제 시 이 목록에 URL을 남기고, 수집 스크립트가 이 목록을 건너뛰면 영구 제외됩니다.

create table if not exists public.blocked_references (
  source_url text primary key,
  blocked_at timestamptz not null default now()
);

-- RLS 켜두되 공개 정책은 두지 않음 → 수집 스크립트(service_role)만 읽습니다.
alter table public.blocked_references enable row level security;

create or replace function public.block_reference(input_password text, p_source_url text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.verify_admin_password(input_password) then
    raise exception '비밀번호가 올바르지 않습니다.';
  end if;

  insert into public.blocked_references (source_url)
  values (p_source_url)
  on conflict (source_url) do nothing;
end;
$$;

grant execute on function public.block_reference(text, text) to anon;
