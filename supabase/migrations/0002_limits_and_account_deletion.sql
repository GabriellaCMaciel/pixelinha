-- PixeLinha: tidy folder names, cap how much one person can store, and let people
-- delete their own account. Run once in the Supabase dashboard: SQL Editor -> New query.

-- 1) A person cannot have two folders with the same name (ignoring case and spaces).
create unique index folders_user_name_key
  on public.folders (user_id, lower(btrim(name)));

-- 2) Limits per person, so a free project is not filled by one account.
create function public.enforce_library_limits() returns trigger
language plpgsql
set search_path = ''
as $$
declare
  total integer;
begin
  if tg_table_name = 'embroideries' then
    select count(*) into total from public.embroideries where user_id = new.user_id;
    if total >= 100 then
      raise exception 'limit_embroideries' using errcode = 'P0001';
    end if;
  elsif tg_table_name = 'folders' then
    select count(*) into total from public.folders where user_id = new.user_id;
    if total >= 30 then
      raise exception 'limit_folders' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

create trigger embroideries_limit
  before insert on public.embroideries
  for each row execute function public.enforce_library_limits();

create trigger folders_limit
  before insert on public.folders
  for each row execute function public.enforce_library_limits();

-- 3) Delete my own account. The folders and embroideries go with it (on delete cascade).
--    The site removes the photos from storage first, because files are not deleted by SQL.
create function public.delete_my_account() returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not_signed_in' using errcode = '28000';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
