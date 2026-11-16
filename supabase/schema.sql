-- Percha · esquema inicial (entrega 1: clóset)
-- Pegalo completo en Supabase → SQL Editor → Run.

create table if not exists public.garments (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  brand        text not null default '',
  description  text not null default '',
  category     text not null check (category in ('top','outerwear','bottom','footwear','headwear','eyewear','accessory')),
  subcategory  text not null,
  colors       text[] not null default '{}',
  styles       text[] not null default '{}',
  warmth       smallint not null default 2 check (warmth between 1 and 3),
  formality    smallint not null default 2 check (formality between 1 and 3),
  image_path   text not null,
  thumb_path   text not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists garments_user_created_idx on public.garments (user_id, created_at desc);

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

drop trigger if exists garments_touch on public.garments;
create trigger garments_touch before update on public.garments
  for each row execute function public.touch_updated_at();

-- Seguridad por filas: cada usuario ve y toca solo lo suyo
alter table public.garments enable row level security;

drop policy if exists "garments_select_own" on public.garments;
drop policy if exists "garments_insert_own" on public.garments;
drop policy if exists "garments_update_own" on public.garments;
drop policy if exists "garments_delete_own" on public.garments;

create policy "garments_select_own" on public.garments for select to authenticated using (user_id = auth.uid());
create policy "garments_insert_own" on public.garments for insert to authenticated with check (user_id = auth.uid());
create policy "garments_update_own" on public.garments for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "garments_delete_own" on public.garments for delete to authenticated using (user_id = auth.uid());

-- Bucket privado para las imágenes. Cada usuario escribe en la carpeta <su id>/
insert into storage.buckets (id, name, public)
values ('garments', 'garments', false)
on conflict (id) do nothing;

drop policy if exists "garments_files_select" on storage.objects;
drop policy if exists "garments_files_insert" on storage.objects;
drop policy if exists "garments_files_delete" on storage.objects;

create policy "garments_files_select" on storage.objects for select to authenticated
  using (bucket_id = 'garments' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "garments_files_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'garments' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "garments_files_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'garments' and (storage.foldername(name))[1] = auth.uid()::text);
