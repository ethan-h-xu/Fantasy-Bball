import "server-only";
import { buildLeagueChoices, type LeagueChoice } from "@/lib/league-choices";
import { getLeague, getNbaState, getUserNbaLeagues, isLockIn } from "@/lib/sleeper";

/** How many seasons back to look for a user's leagues. */
const SEASONS_TO_SEARCH = 8;

/**
 * What the league picker offers a user, in this season and past ones. The picker's save action
 * uses this too, so a form can only follow leagues that were offered.
 */
export async function getLeagueChoices(
  sleeperUserId: string,
  followedIds: string[],
): Promise<{ season: string; nbaLeagueCount: number; choices: LeagueChoice[] }> {
  const { league_season: season } = await getNbaState();
  const seasons = Array.from({ length: SEASONS_TO_SEARCH }, (_, i) => String(Number(season) - i));

  const [leaguesBySeason, followed] = await Promise.all([
    Promise.all(seasons.map((s) => getUserNbaLeagues(sleeperUserId, s))),
    Promise.all(followedIds.map(getLeague)),
  ]);
  const leagues = [
    ...leaguesBySeason.flat(),
    // A followed league can be older than the search, or one the user has since left.
    ...followed.filter((league) => league !== null),
  ];

  return {
    season,
    nbaLeagueCount: leaguesBySeason[0].length,
    choices: buildLeagueChoices(leagues, followedIds, isLockIn),
  };
}
