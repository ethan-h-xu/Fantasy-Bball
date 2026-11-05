import type { League } from "@/lib/sleeper";

// Sleeper gives every season of a league a new ID, which points back to the season before. The
// league picker groups those back into one row per league, with a choice of season. A follow stays
// on the season the user chose: moving to a new one is always their decision, on the picker.

export interface SeasonChoice {
  leagueId: string;
  season: string;
}

export interface LeagueChoice {
  name: string;
  totalRosters: number;
  /** Newest first. */
  seasons: SeasonChoice[];
  /** The season the user follows, if any. */
  followedId: string | null;
  /** The user follows this league, but on a season older than the newest one offered. */
  newSeasonAvailable: boolean;
}

/**
 * `leagues` is every league to consider, in any order. New follows can only be Lock-In seasons,
 * but a season that's already followed is always offered, so saving the form can't drop it.
 */
export function buildLeagueChoices(
  leagues: League[],
  followedIds: string[],
  isLockIn: (league: League) => boolean,
): LeagueChoice[] {
  const byId = new Map(leagues.map((league) => [league.league_id, league]));
  const followed = new Set(followedIds);
  const renewed = new Set([...byId.values()].map((league) => league.previous_league_id));

  const choices: LeagueChoice[] = [];
  // Each league with no newer season is the start of one row.
  for (const newest of byId.values()) {
    if (renewed.has(newest.league_id)) continue;

    const seasons: League[] = [];
    const seen = new Set<string>();
    let league: League | undefined = newest;
    while (league && !seen.has(league.league_id)) {
      seen.add(league.league_id);
      if (isLockIn(league) || followed.has(league.league_id)) seasons.push(league);
      league = league.previous_league_id ? byId.get(league.previous_league_id) : undefined;
    }
    if (seasons.length === 0) continue;

    // Normally there's only one, but if there are more, the newest is the one that gets kept.
    const followedId = seasons.find((s) => followed.has(s.league_id))?.league_id ?? null;
    choices.push({
      name: seasons[0].name.trim(),
      totalRosters: seasons[0].total_rosters,
      seasons: seasons.map((s) => ({ leagueId: s.league_id, season: s.season })),
      followedId,
      newSeasonAvailable: followedId !== null && followedId !== seasons[0].league_id,
    });
  }

  return choices.sort(
    (a, b) => Number(b.seasons[0].season) - Number(a.seasons[0].season) || a.name.localeCompare(b.name),
  );
}
