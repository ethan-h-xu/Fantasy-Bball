import "server-only";
import { cacheLife } from "next/cache";
import { buildSeason, type SeasonHistory } from "@/lib/league-stats";
import {
  fetchBracket,
  fetchMatchups,
  fetchTransactions,
  getLeague,
  getLeagueRosters,
  getLeagueUsers,
  type League,
} from "@/lib/sleeper";

/** Finished seasons don't change, so they keep for much longer than the season in progress. */
async function getSeasonHistory(leagueId: string): Promise<SeasonHistory | null> {
  "use cache";
  const league = await getLeague(leagueId);
  if (league?.status === "complete") cacheLife("weeks");
  else cacheLife("minutes");
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
