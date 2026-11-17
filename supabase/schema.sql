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
-- (old open share link — switched off: logging in is required now)

-- =========================================================
-- PART 2 — Accounts: one admin (the DM) and players.
-- Run this whole file again after updating (it is safe to run twice).
-- =========================================================

-- Who belongs to whose world. The admin is the owner of the world.
create table if not exists public.members (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  owner      uuid not null references auth.users (id) on delete cascade,  -- the admin whose world this is
  role       text not null check (role in ('admin', 'player')),
  name       text not null default '' check (char_length(name) <= 60),
  username   text not null default '' check (char_length(username) <= 120),
  created_at timestamptz not null default now()
);
alter table public.members enable row level security;
drop policy if exists "see own membership or your players" on public.members;
drop policy if exists "admin registers self" on public.members;
drop policy if exists "admin removes players" on public.members;
create policy "see own membership or your players" on public.members for select to authenticated
  using (user_id = (select auth.uid()) or owner = (select auth.uid()));
create policy "admin registers self" on public.members for insert to authenticated
  with check (user_id = (select auth.uid()) and owner = (select auth.uid()) and role = 'admin');
create policy "admin removes players" on public.members for delete to authenticated
  using (owner = (select auth.uid()) and role = 'player');
-- (players are created by the "manage-players" function, which checks you are an admin)

-- NPCs that players add.
create table if not exists public.player_npcs (
  id            uuid primary key default gen_random_uuid(),
  owner         uuid not null references auth.users (id) on delete cascade,  -- whose world
  author        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  author_name   text not null default '' check (char_length(author_name) <= 60),
  name          text not null check (char_length(name) between 1 and 80),
  race          text not null default '' check (char_length(race) <= 40),
  occupation    text not null default '' check (char_length(occupation) <= 60),
  location_id   text not null default '' check (char_length(location_id) <= 60),
  location_name text not null default '' check (char_length(location_name) <= 80),
  description   text not null default '' check (char_length(description) <= 2000),
  linked_npc_id text check (char_length(linked_npc_id) <= 60),
  link_reason   text not null default '' check (char_length(link_reason) <= 200),
  status        text not null default 'new' check (status in ('new', 'seen', 'added')),
  created_at    timestamptz not null default now()
);
alter table public.player_npcs enable row level security;
drop policy if exists "world members can read" on public.player_npcs;
drop policy if exists "players add to their world" on public.player_npcs;
drop policy if exists "author or admin can change" on public.player_npcs;
drop policy if exists "author or admin can delete" on public.player_npcs;
create policy "world members can read" on public.player_npcs for select to authenticated
  using (owner = (select auth.uid()) or exists (select 1 from public.members m where m.user_id = (select auth.uid()) and m.owner = player_npcs.owner));
create policy "players add to their world" on public.player_npcs for insert to authenticated
  with check (author = (select auth.uid()) and exists (select 1 from public.members m where m.user_id = (select auth.uid()) and m.owner = player_npcs.owner and m.role = 'player'));
create policy "author or admin can change" on public.player_npcs for update to authenticated
  using (owner = (select auth.uid()) or author = (select auth.uid()))
  with check (owner = (select auth.uid()) or author = (select auth.uid()));
create policy "author or admin can delete" on public.player_npcs for delete to authenticated
  using (owner = (select auth.uid()) or author = (select auth.uid()));

-- A logged-in player gets ONLY the player-safe copy of their admin's world.
create or replace function public.get_my_player_world()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select w.player_data || jsonb_build_object('updated_at', w.updated_at, 'owner', w.owner)
  from public.worlds w
  join public.members m on m.owner = w.owner
  where m.user_id = (select auth.uid()) and m.role = 'player'
  limit 1;
$$;
revoke all on function public.get_my_player_world() from public;
grant execute on function public.get_my_player_world() to authenticated;

-- Logging in is required: make sure the old "anyone with the link" view is off.
revoke execute on function public.get_player_world(text) from anon, authenticated;

-- =========================================================
-- PART 3 — Phone notifications for players
-- =========================================================
create table if not exists public.push_subscriptions (
  endpoint   text primary key check (char_length(endpoint) <= 1000),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  owner      uuid not null references auth.users (id) on delete cascade,  -- whose world they follow
  p256dh     text not null check (char_length(p256dh) <= 200),
  auth       text not null check (char_length(auth) <= 100),
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
drop policy if exists "manage own subscriptions" on public.push_subscriptions;
create policy "manage own subscriptions" on public.push_subscriptions for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and (owner = (select auth.uid()) or exists (select 1 from public.members m where m.user_id = (select auth.uid()) and m.owner = push_subscriptions.owner)));

-- =========================================================
-- PART 4 — Player characters and the party pin
-- =========================================================
-- One character per player (backstory, family, people from their past). Only the player and the admin can read it.
create table if not exists public.player_characters (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null references auth.users (id) on delete cascade,   -- whose world
  player      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  player_name text not null default '' check (char_length(player_name) <= 60),
  data        jsonb not null default '{}'::jsonb check (pg_column_size(data) < 600000),
  updated_at  timestamptz not null default now(),
  unique (owner, player)
);
alter table public.player_characters enable row level security;
drop policy if exists "player or admin can read" on public.player_characters;
drop policy if exists "player creates own" on public.player_characters;
drop policy if exists "player edits own" on public.player_characters;
drop policy if exists "player or admin can delete" on public.player_characters;
create policy "player or admin can read" on public.player_characters for select to authenticated
  using (player = (select auth.uid()) or owner = (select auth.uid()));
create policy "player creates own" on public.player_characters for insert to authenticated
  with check (player = (select auth.uid()) and exists (select 1 from public.members m where m.user_id = (select auth.uid()) and m.owner = player_characters.owner and m.role = 'player'));
create policy "player edits own" on public.player_characters for update to authenticated
  using (player = (select auth.uid())) with check (player = (select auth.uid()));
create policy "player or admin can delete" on public.player_characters for delete to authenticated
  using (player = (select auth.uid()) or owner = (select auth.uid()));

-- Where is the party? One pin per map; placing it again moves it.
create table if not exists public.party_pins (
  owner       uuid not null references auth.users (id) on delete cascade,
  map_id      text not null check (char_length(map_id) <= 60),
  x           real not null check (x >= 0 and x <= 100),
  y           real not null check (y >= 0 and y <= 100),
  set_by_name text not null default '' check (char_length(set_by_name) <= 60),
  updated_at  timestamptz not null default now(),
  primary key (owner, map_id)
);
alter table public.party_pins enable row level security;
drop policy if exists "the whole table can use the party pin" on public.party_pins;
create policy "the whole table can use the party pin" on public.party_pins for all to authenticated
  using (owner = (select auth.uid()) or exists (select 1 from public.members m where m.user_id = (select auth.uid()) and m.owner = party_pins.owner))
  with check (owner = (select auth.uid()) or exists (select 1 from public.members m where m.user_id = (select auth.uid()) and m.owner = party_pins.owner));
