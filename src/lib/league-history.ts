import "server-only";
import { cacheLife } from "next/cache";
import { buildSeason, SUMMARY_FORMAT_VERSION, type SeasonHistory } from "@/lib/league-stats";
import {
  fetchBracket,
  fetchMatchups,
  fetchTransactions,
  getLeague,
  getLeagueRosters,
  getLeagueUsers,
  type League,
} from "@/lib/sleeper";
import { createAdminClient } from "@/lib/supabase/admin";

/** Dozens of Sleeper calls. Everything else in this file exists to avoid repeating them. */
async function buildSeasonFromSleeper(leagueId: string): Promise<SeasonHistory | null> {
  "use cache";
  cacheLife("minutes");
  const league = await getLeague(leagueId);
  if (!league) return null;

  const weeks = Array.from({ length: Math.max(league.settings.leg ?? 0, 0) }, (_, i) => i + 1);
  const [users, rosters, winnersBracket, losersBracket, matchups, transactions] = await Promise.all([
    getLeagueUsers(leagueId),
    getLeagueRosters(leagueId),
    fetchBracket(leagueId, "winners"),
    fetchBracket(leagueId, "losers"),
    Promise.all(weeks.map((week) => fetchMatchups(leagueId, week))),
    Promise.all(weeks.map((week) => fetchTransactions(leagueId, week))),
  ]);

  return buildSeason({
    league,
    users,
    rosters,
    matchupsByWeek: Object.fromEntries(weeks.map((week, i) => [week, matchups[i]])),
    transactions: transactions.flat(),
    winnersBracket,
    losersBracket,
  });
}

// The database only saves Sleeper calls, so a problem with it is logged and the page carries on.

async function readStoredSeason(leagueId: string): Promise<SeasonHistory | null> {
  const supabase = createAdminClient();
  if (!supabase) {
    console.error("SUPABASE_SECRET_KEY isn't set, so past seasons are being rebuilt from Sleeper.");
    return null;
  }
  const { data, error } = await supabase
    .from("season_summaries")
    .select("summary")
    .eq("league_id", leagueId)
    .eq("format_version", SUMMARY_FORMAT_VERSION)
    .maybeSingle();
  if (error) console.error(`Could not read season ${leagueId}: ${error.message}`);
  return data?.summary ?? null;
}

async function storeSeason(season: SeasonHistory): Promise<void> {
  const { error } =
    (await createAdminClient()
      ?.from("season_summaries")
      .upsert({ league_id: season.leagueId, format_version: SUMMARY_FORMAT_VERSION, summary: season })) ?? {};
  if (error) console.error(`Could not save season ${season.leagueId}: ${error.message}`);
}

async function getSeasonHistory(leagueId: string): Promise<SeasonHistory | null> {
  const stored = await readStoredSeason(leagueId);
  if (stored) return stored;

  const season = await buildSeasonFromSleeper(leagueId);
  // Rows are kept for good, so a season missing its data, as a Sleeper glitch could cause, isn't saved.
  if (season && !season.inProgress && season.regularSeason.length > 0 && season.games.length > 0) {
    await storeSeason(season);
  }
  return season;
}

/** This season and every earlier one, newest first. One season at a time, to go easy on Sleeper. */
async function getLeagueHistory(leagueId: string): Promise<SeasonHistory[]> {
  const seasons: SeasonHistory[] = [];
  const seen = new Set<string>();
  // Sleeper has been seen to use both null and "0" for "no previous league".
  let id: string | null = leagueId;
  while (id && id !== "0" && !seen.has(id)) {
    seen.add(id);
    const season: SeasonHistory | null = await getSeasonHistory(id);
    if (!season) break;
    seasons.push(season);
    id = season.previousLeagueId;
  }
  return seasons;
}

/**
 * The league and its history, or null if it doesn't exist, isn't NBA, or the user isn't in it.
 * Those cases aren't told apart, so a page can't reveal which leagues exist.
 */
export async function getLeagueHistoryForMember(
  leagueId: string,
  sleeperUserId: string,
): Promise<{ league: League; seasons: SeasonHistory[] } | null> {
  const [league, users] = await Promise.all([getLeague(leagueId), getLeagueUsers(leagueId)]);
  if (!league || league.sport !== "nba" || !users.some((u) => u.user_id === sleeperUserId)) return null;
  return { league, seasons: await getLeagueHistory(leagueId) };
}
