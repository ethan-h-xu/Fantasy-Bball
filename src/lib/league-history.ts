import "server-only";
import { cacheLife } from "next/cache";
import {
  buildSeason,
  SUMMARY_FORMAT_VERSION,
  totalsMatchGames,
  type SeasonHistory,
  type SeasonWeeks,
} from "@/lib/league-stats";
import {
  fetchBracket,
  fetchLeague,
  fetchLeagueRosters,
  fetchLeagueUsers,
  fetchMatchups,
  fetchTransactions,
  getLeague,
  getLeagueUsers,
  type League,
} from "@/lib/sleeper";
import { createAdminClient } from "@/lib/supabase/admin";

/** A season in progress is refreshed from Sleeper by the first page view after this long. */
const REFRESH_AFTER_MS = 60 * 60 * 1000;

interface LoadedSeason {
  season: SeasonHistory;
  weeks: SeasonWeeks;
}

function weekRange(first: number, last: number): number[] {
  return Array.from({ length: Math.max(last - first + 1, 0) }, (_, i) => first + i);
}

/**
 * Fetches a season from Sleeper. Given the weeks already stored, it only fetches from the last
 * scored week on, because that week can still get late corrections. Scores are only fetched for
 * scored weeks, so live scores are never stored, but roster moves are fetched up to the current
 * week. Everything else that's fetched can change at any time. When a season finishes, all of it
 * is fetched again, since that copy is kept for good.
 */
async function loadSeason(leagueId: string, stored: SeasonWeeks | null): Promise<LoadedSeason | null> {
  const league = await fetchLeague(leagueId);
  if (!league) return null;

  const currentWeek = league.settings.leg ?? 0;
  const lastScored = league.settings.last_scored_leg ?? (league.status === "complete" ? currentWeek : 0);
  const firstWeek = stored && league.status !== "complete" ? Math.max(stored.scoredThrough, 1) : 1;
  const scoredWeeks = weekRange(firstWeek, lastScored);
  const moveWeeks = weekRange(firstWeek, currentWeek);

  const [users, rosters, winnersBracket, losersBracket, matchups, transactions] = await Promise.all([
    fetchLeagueUsers(leagueId),
    fetchLeagueRosters(leagueId),
    fetchBracket(leagueId, "winners"),
    fetchBracket(leagueId, "losers"),
    Promise.all(scoredWeeks.map((week) => fetchMatchups(leagueId, week))),
    Promise.all(moveWeeks.map((week) => fetchTransactions(leagueId, week))),
  ]);

  const weeks: SeasonWeeks = {
    scoredThrough: lastScored,
    matchups: { ...stored?.matchups, ...Object.fromEntries(scoredWeeks.map((week, i) => [week, matchups[i]])) },
    transactions: {
      ...stored?.transactions,
      ...Object.fromEntries(moveWeeks.map((week, i) => [week, transactions[i]])),
    },
  };

  const season = buildSeason({
    league,
    users,
    rosters,
    matchupsByWeek: weeks.matchups,
    transactions: Object.values(weeks.transactions).flat(),
    winnersBracket,
    losersBracket,
  });
  return { season, weeks };
}

/** Dozens of Sleeper calls, so this is still cached for if the database can't be reached. */
async function loadWholeSeason(leagueId: string): Promise<LoadedSeason | null> {
  "use cache";
  cacheLife("minutes");
  return loadSeason(leagueId, null);
}

// The database only saves Sleeper calls, so a problem with it is logged and the page carries on.

async function readStoredSeason(leagueId: string) {
  const supabase = createAdminClient();
  if (!supabase) {
    console.error("SUPABASE_SECRET_KEY isn't set, so seasons are being rebuilt from Sleeper.");
    return null;
  }
  const { data, error } = await supabase
    .from("season_summaries")
    .select("summary, weeks, updated_at")
    .eq("league_id", leagueId)
    .eq("format_version", SUMMARY_FORMAT_VERSION)
    .maybeSingle();
  if (error) console.error(`Could not read season ${leagueId}: ${error.message}`);
  return data;
}

async function storeSeason({ season, weeks }: LoadedSeason): Promise<void> {
  const { error } =
    (await createAdminClient()
      ?.from("season_summaries")
      .upsert({
        league_id: season.leagueId,
        format_version: SUMMARY_FORMAT_VERSION,
        summary: season,
        weeks: season.inProgress ? weeks : null,
      })) ?? {};
  if (error) console.error(`Could not save season ${season.leagueId}: ${error.message}`);
}

/**
 * A finished season is kept for good, so it's only saved if its data looks right. If not, the next
 * page view tries again. A season in progress gets replaced within the hour, so it's always saved.
 */
function isSafeToStore(season: SeasonHistory): boolean {
  return (
    season.inProgress ||
    (totalsMatchGames(season) && season.regularSeason.length > 0 && season.games.length > 0)
  );
}

async function getSeasonHistory(leagueId: string): Promise<SeasonHistory | null> {
  const stored = await readStoredSeason(leagueId);
  if (stored && (!stored.summary.inProgress || Date.now() - Date.parse(stored.updated_at) < REFRESH_AFTER_MS)) {
    return stored.summary;
  }

  try {
    const loaded = stored?.weeks ? await loadSeason(leagueId, stored.weeks) : await loadWholeSeason(leagueId);
    if (!loaded) return stored?.summary ?? null;
    if (isSafeToStore(loaded.season)) await storeSeason(loaded);
    return loaded.season;
  } catch (error) {
    // Slightly old numbers are better than an error page if Sleeper is having problems.
    if (!stored) throw error;
    console.error(`Could not refresh season ${leagueId}, so showing the stored one:`, error);
    return stored.summary;
  }
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
