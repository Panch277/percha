-- Percha · migración 003 (entrega 3: calendario mensual)
-- Idempotente: se puede correr más de una vez. Pegala en Supabase → SQL Editor → Run.

-- Un outfit por día. Si se borra el outfit, el día queda libre (cascade).
create table if not exists public.calendar_entries (
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date        date not null,
  outfit_id   uuid not null references public.outfits (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, date)
);

create index if not exists calendar_entries_outfit_idx on public.calendar_entries (outfit_id);

alter table public.calendar_entries enable row level security;

drop policy if exists "calendar_select_own" on public.calendar_entries;
drop policy if exists "calendar_insert_own" on public.calendar_entries;
drop policy if exists "calendar_update_own" on public.calendar_entries;
drop policy if exists "calendar_delete_own" on public.calendar_entries;

-- Además de ser dueño de la fila, el outfit asignado tiene que ser propio
create policy "calendar_select_own" on public.calendar_entries for select to authenticated
  using (user_id = auth.uid());
create policy "calendar_insert_own" on public.calendar_entries for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.outfits o where o.id = outfit_id and o.user_id = auth.uid()));
create policy "calendar_update_own" on public.calendar_entries for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and exists (select 1 from public.outfits o where o.id = outfit_id and o.user_id = auth.uid()));
create policy "calendar_delete_own" on public.calendar_entries for delete to authenticated
  using (user_id = auth.uid());
