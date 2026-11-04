-- Summaries of finished seasons, so they don't have to be rebuilt from dozens of Sleeper calls.
-- This is a cache: Sleeper is still the source, and deleting a row just makes the app rebuild it.

create table public.season_summaries (
  -- Each season of a league has its own Sleeper league ID.
  league_id text primary key check (length(trim(league_id)) > 0),
  -- Rows saved by an older version of the app are rebuilt. See SUMMARY_FORMAT_VERSION.
  format_version integer not null,
  summary jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger season_summaries_set_updated_at
  before update on public.season_summaries
  for each row execute function public.set_updated_at();

-- Access: the server only, using the secret key. Rows are shared by every user, so if users
-- could write them, anyone could fake a league's standings. With row-level security on and
-- no policies, the publishable key can't read or write this table.
revoke all on public.season_summaries from anon, authenticated;
grant select, insert, update, delete on public.season_summaries to service_role;

alter table public.season_summaries enable row level security;
