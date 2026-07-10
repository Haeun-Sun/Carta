-- 관리자가 사이트에서 직접 링크를 붙여 레퍼런스를 추가하는 기능용 함수입니다.
-- Supabase SQL Editor에 그대로 붙여 한 번 실행하세요. (기존 verify_admin_password 함수를 재사용합니다)
--
-- 프론트엔드는 공개(anon) 키만 쓰므로 테이블에 직접 INSERT할 수 없습니다(RLS).
-- 그래서 비밀번호를 확인한 뒤에만 삽입하는 SECURITY DEFINER 함수를 통해 우회합니다.
-- (삭제 기능의 delete_reference와 같은 방식)

create or replace function public.add_reference(
  input_password  text,
  p_source_url    text,
  p_source        text default 'manual',
  p_title         text default null,
  p_author        text default null,
  p_category      text default null,
  p_thumbnail_url text default null
) returns public.references
language plpgsql
security definer
set search_path = public
as $$
declare
  new_row public.references;
begin
  if not public.verify_admin_password(input_password) then
    raise exception '비밀번호가 올바르지 않습니다.';
  end if;

  insert into public.references
    (source, source_url, title, author, category, thumbnail_url, description, keywords, published_at, score)
  values
    (coalesce(nullif(p_source, ''), 'manual'),
     p_source_url,
     coalesce(nullif(p_title, ''), '(제목 없음)'),
     nullif(p_author, ''),
     nullif(p_category, ''),
     nullif(p_thumbnail_url, ''),
     null,
     '{}',
     now(),
     null)
  returning * into new_row;

  return new_row;
exception
  when unique_violation then
    raise exception '이미 등록된 영상입니다.';
end;
$$;

grant execute on function public.add_reference(text, text, text, text, text, text, text) to anon;
