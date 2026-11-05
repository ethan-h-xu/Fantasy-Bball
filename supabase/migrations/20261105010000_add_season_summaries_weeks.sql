-- Seasons in progress are stored too, and refreshed from Sleeper when they're an hour old.
-- This keeps their per-week data, so a refresh only has to fetch the most recent weeks.
-- It's null for finished seasons, which are never refreshed.
alter table public.season_summaries add column weeks jsonb;
