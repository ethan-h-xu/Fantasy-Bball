-- Accounts data. Email lives in auth.users, so it isn't copied here.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  sleeper_username text not null check (length(trim(sleeper_username)) > 0),
  -- Sleeper usernames can change; the user ID doesn't.
  sleeper_user_id text not null check (length(trim(sleeper_user_id)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- sleeper_username and sleeper_user_id are deliberately not unique. Ownership isn't
-- verified, so a unique rule would let anyone block the real owner by claiming a name first.

create table public.followed_leagues (
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- League details are read live from Sleeper, so only the ID is stored.
  league_id text not null check (length(trim(league_id)) > 0),
  created_at timestamptz not null default now(),
  primary key (user_id, league_id)
);

-- Keep profiles.updated_at current.
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke execute on function public.set_updated_at() from public;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Access: signed-in users only, and only their own rows.
revoke all on public.profiles, public.followed_leagues from anon, authenticated;
grant select, insert, update, delete on public.profiles, public.followed_leagues to authenticated;

alter table public.profiles enable row level security;
alter table public.followed_leagues enable row level security;

create policy "Users can read their own profile"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

create policy "Users can create their own profile"
  on public.profiles for insert to authenticated
  with check ((select auth.uid()) = id);

create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "Users can delete their own profile"
  on public.profiles for delete to authenticated
  using ((select auth.uid()) = id);

create policy "Users can read their own followed leagues"
  on public.followed_leagues for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can follow leagues for themselves"
  on public.followed_leagues for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can unfollow their own leagues"
  on public.followed_leagues for delete to authenticated
  using ((select auth.uid()) = user_id);
