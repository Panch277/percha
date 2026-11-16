-- Percha · migración 002 (entrega 2: generador de outfits)
-- Idempotente: se puede correr más de una vez. Pegala en Supabase → SQL Editor → Run.

-- 1) Prendas: marca de estampado (para no juntar dos estampados en un outfit)
alter table public.garments add column if not exists pattern boolean not null default false;

-- 2) Outfits guardados
create table if not exists public.outfits (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  occasion    text not null check (occasion in ('casual','night','office','sport')),
  style       text not null,
  item_ids    uuid[] not null check (cardinality(item_ids) between 1 and 10),
  date        date,
  tryon_path  text,
  created_at  timestamptz not null default now()
);

create index if not exists outfits_user_created_idx on public.outfits (user_id, created_at desc);

alter table public.outfits enable row level security;

drop policy if exists "outfits_select_own" on public.outfits;
drop policy if exists "outfits_insert_own" on public.outfits;
drop policy if exists "outfits_update_own" on public.outfits;
drop policy if exists "outfits_delete_own" on public.outfits;

create policy "outfits_select_own" on public.outfits for select to authenticated using (user_id = auth.uid());
create policy "outfits_insert_own" on public.outfits for insert to authenticated with check (user_id = auth.uid());
create policy "outfits_update_own" on public.outfits for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "outfits_delete_own" on public.outfits for delete to authenticated using (user_id = auth.uid());

-- 3) Preferencias: una fila por usuario con los pesos de like/dislike y la ciudad del clima
create table if not exists public.preferences (
  user_id     uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  weights     jsonb not null default '{"items":{},"pairs":{}}'::jsonb,
  city        jsonb,
  updated_at  timestamptz not null default now()
);

drop trigger if exists preferences_touch on public.preferences;
create trigger preferences_touch before update on public.preferences
  for each row execute function public.touch_updated_at();

alter table public.preferences enable row level security;

drop policy if exists "preferences_select_own" on public.preferences;
drop policy if exists "preferences_insert_own" on public.preferences;
drop policy if exists "preferences_update_own" on public.preferences;

create policy "preferences_select_own" on public.preferences for select to authenticated using (user_id = auth.uid());
create policy "preferences_insert_own" on public.preferences for insert to authenticated with check (user_id = auth.uid());
create policy "preferences_update_own" on public.preferences for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
