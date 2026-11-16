-- =========================================================
-- WORLD KEEPER — database recipe (the "kitchen")
-- Paste ALL of this into Supabase → SQL Editor → New query → Run.
-- It is safe to run more than once.
-- =========================================================

-- One row per Dungeon Master: their whole world as one JSON document.
create table if not exists public.worlds (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null unique references auth.users (id) on delete cascade,
  data        jsonb not null default '{}'::jsonb,   -- EVERYTHING (incl. secrets) — only the owner can read it
  player_data jsonb not null default '{}'::jsonb,   -- player-safe copy (no secrets, only NPCs players have met)
  share_code  text unique,                          -- the secret code in the player-view link
  updated_at  timestamptz not null default now()
);

-- Row Level Security = the bouncer. Nobody gets in unless a rule below lets them.
alter table public.worlds enable row level security;

drop policy if exists "owner can read"   on public.worlds;
drop policy if exists "owner can insert" on public.worlds;
drop policy if exists "owner can update" on public.worlds;
drop policy if exists "owner can delete" on public.worlds;

create policy "owner can read"   on public.worlds for select to authenticated using ((select auth.uid()) = owner);
create policy "owner can insert" on public.worlds for insert to authenticated with check ((select auth.uid()) = owner);
create policy "owner can update" on public.worlds for update to authenticated using ((select auth.uid()) = owner) with check ((select auth.uid()) = owner);
create policy "owner can delete" on public.worlds for delete to authenticated using ((select auth.uid()) = owner);

-- Players (not logged in) can ONLY get the player-safe copy, and only with the exact share code.
create or replace function public.get_player_world(code text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select player_data || jsonb_build_object('updated_at', updated_at)
  from public.worlds
  where share_code = code and length(code) >= 12
  limit 1;
$$;

revoke all on function public.get_player_world(text) from public;
grant execute on function public.get_player_world(text) to anon, authenticated;
