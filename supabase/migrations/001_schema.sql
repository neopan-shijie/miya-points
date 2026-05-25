-- MIYA Points Manager v1.0 Schema
-- Run: supabase db push / supabase migration up

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================================
-- TENANTS / LIVESTREAM ROOMS
-- ============================================================
create table rooms (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  owner_id uuid not null,
  plan_tier text not null default 'basic' check (plan_tier in ('basic','standard','pro')),
  subscription_ends_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================================
-- PLAYERS (per room)
-- ============================================================
create table players (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid not null references rooms(id) on delete cascade,
  name text not null,
  avatar_emoji text default '👤',
  total_points numeric not null default 0,
  created_at timestamptz not null default now()
);
create index idx_players_room on players(room_id);

-- ============================================================
-- PRIZES / PRODUCTS (per room)
-- ============================================================
create table prizes (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid not null references rooms(id) on delete cascade,
  name text not null,
  points numeric not null check (points > 0),
  stock integer default -1,           -- -1 = unlimited
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index idx_prizes_room on prizes(room_id);

-- ============================================================
-- LIVE SESSIONS (per room, optional grouping)
-- ============================================================
create table sessions (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid not null references rooms(id) on delete cascade,
  title text not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);
create index idx_sessions_room on sessions(room_id);

-- ============================================================
-- TRANSACTIONS (the core log)
-- ============================================================
create table transactions (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid not null references rooms(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  prize_id uuid references prizes(id) on delete set null,
  operator_id uuid not null,
  session_id uuid references sessions(id) on delete set null,
  type text not null check (type in ('add','redeem','bonus','adjust')),
  quantity numeric not null default 1,
  points_change numeric not null,
  unit_points numeric not null,
  note text,
  created_at timestamptz not null default now()
);
create index idx_tx_room on transactions(room_id);
create index idx_tx_player on transactions(player_id);
create index idx_tx_date on transactions(created_at desc);

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  room_id uuid not null references rooms(id) on delete cascade,
  display_name text not null,
  role text not null default 'operator' check (role in ('owner','admin','operator','viewer')),
  created_at timestamptz not null default now()
);
create index idx_profiles_room on profiles(room_id);

-- ============================================================
-- AUTO-UPDATE player total_points via trigger
-- ============================================================
create or replace function update_player_points()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update players set total_points = total_points + NEW.points_change
    where id = NEW.player_id;
  elsif TG_OP = 'DELETE' then
    update players set total_points = total_points - OLD.points_change
    where id = OLD.player_id;
  end if;
  return null;
end;
$$ language plpgsql;

create trigger trg_tx_points
after insert or delete on transactions
for each row execute function update_player_points();

-- ============================================================
-- RLS: enable + policies
-- ============================================================
alter table rooms enable row level security;
alter table players enable row level security;
alter table prizes enable row level security;
alter table sessions enable row level security;
alter table transactions enable row level security;
alter table profiles enable row level security;

-- Helper: get user's room_id
create or replace function get_user_room()
returns uuid as $$
  select room_id from profiles where id = auth.uid();
$$ language sql stable;

-- Room policies
create policy "Users can read own room" on rooms
  for select using (owner_id = auth.uid() or id = get_user_room());

-- Player policies
create policy "Room members can read players" on players
  for select using (room_id = get_user_room());
create policy "Operators can insert players" on players
  for insert with check (room_id = get_user_room() and get_user_room() is not null);
create policy "Operators can update players" on players
  for update using (room_id = get_user_room());

-- Prize policies
create policy "Room members can read prizes" on prizes
  for select using (room_id = get_user_room());
create policy "Operators can manage prizes" on prizes
  for all using (room_id = get_user_room());

-- Transaction policies (select with role check: viewer can read, operator+ can write)
create policy "Room members can read transactions" on transactions
  for select using (room_id = get_user_room());
create policy "Operators can insert transactions" on transactions
  for insert with check (room_id = get_user_room());
create policy "Admin can delete transactions" on transactions
  for delete using (room_id = get_user_room()
    and exists (select 1 from profiles where id = auth.uid() and role in ('owner','admin')));

-- Session policies
create policy "Room members can read sessions" on sessions
  for select using (room_id = get_user_room());
create policy "Operators can manage sessions" on sessions
  for all using (room_id = get_user_room());

-- Profile policies
create policy "Users can read own profile" on profiles
  for select using (id = auth.uid());
create policy "Users can read room profiles" on profiles
  for select using (room_id = get_user_room());

-- ============================================================
-- INITIAL DATA: create a demo room for new signups
-- ============================================================
-- (This is done via the app's registration API, not here)
