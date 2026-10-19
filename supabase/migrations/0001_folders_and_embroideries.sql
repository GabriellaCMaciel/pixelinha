-- PixeLinha: folders and saved embroideries, each visible only to its owner.
-- Run once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.

-- 1) Tables ---------------------------------------------------------------

create table public.folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  created_at timestamptz not null default now(),
  -- lets an embroidery prove that its folder belongs to the same person
  unique (id, user_id)
);

create table public.embroideries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  folder_id uuid,
  title text not null check (char_length(btrim(title)) between 1 and 80),
  -- size, colors, fabric and background choices used to rebuild the chart
  settings jsonb not null,
  photo_path text not null,
  thumb_path text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- deleting a folder keeps its embroideries and moves them out of any folder
  foreign key (folder_id, user_id) references public.folders (id, user_id)
    on delete set null (folder_id)
);

create index embroideries_owner_folder_idx on public.embroideries (user_id, folder_id);
create index folders_owner_idx on public.folders (user_id);

create function public.touch_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger embroideries_touch_updated_at
  before update on public.embroideries
  for each row execute function public.touch_updated_at();

-- 2) Row level security: nobody sees or changes another person's data -----

alter table public.folders enable row level security;
alter table public.embroideries enable row level security;

create policy "Owners manage their folders"
  on public.folders for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Owners manage their embroideries"
  on public.embroideries for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- 3) Private bucket for the photos (one folder per person) ---------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'embroidery-photos',
  'embroidery-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy "Owners read their photos"
  on storage.objects for select to authenticated
  using (bucket_id = 'embroidery-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Owners upload their photos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'embroidery-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Owners replace their photos"
  on storage.objects for update to authenticated
  using (bucket_id = 'embroidery-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Owners delete their photos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'embroidery-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
