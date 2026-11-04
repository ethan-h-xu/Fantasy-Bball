import type { BracketGame, League, Matchup, Roster, SleeperUser, Transaction } from "@/lib/sleeper";

// Turns one season's raw Sleeper data into a small summary, and adds summaries up into tables.
// This runs on the server and in the browser, so it can't import anything server-only.

export interface Game {
  phase: "regular" | "playoff";
  teamA: string;
  teamB: string;
  pointsA: number;
  pointsB: number;
  /** Null for a tie. */
  winner: string | null;
}

export interface TeamInfo {
  manager: string;
  /** Null if the manager didn't name their team. */
  team: string | null;
}

export interface TransactionCounts {
  trades: number;
  waivers: number;
  freeAgents: number;
}

export interface FinalResult {
  winner: string;
  opponent: string;
}

export interface SeasonHistory {
  leagueId: string;
  previousLeagueId: string | null;
  name: string;
  season: string;
  inProgress: boolean;
  /** Teams are keyed by Sleeper user ID, because roster IDs change hands between seasons. */
  teams: Record<string, TeamInfo>;
  /** Sleeper's official regular-season totals, for teams that have played. */
  regularSeason: Line[];
  /** Per-game results, for playoff standings and head-to-head records. See buildSeason. */
  games: Game[];
  transactions: Record<string, TransactionCounts>;
  champion: FinalResult | null;
  toiletBowl: FinalResult | null;
}

export interface RawSeason {
  league: League;
  users: SleeperUser[];
  rosters: Roster[];
  matchupsByWeek: Record<number, Matchup[]>;
  transactions: Transaction[];
  winnersBracket: BracketGame[];
  losersBracket: BracketGame[];
}

/**
 * Where each number comes from, most reliable first:
 * - Regular-season standings: the totals on each roster, which match Sleeper's app.
 * - Who won a playoff game, the champion and the toilet bowl winner: the brackets.
 * - Per-game points, so regular-season head-to-head and playoff points: matchups. These can differ
 *   from the official scores (see README), and are the only per-game scores Sleeper publishes.
 *
 * Matchups also exist for weeks that don't count. Later weeks have points but no matchup_id,
 * future weeks have 0 points and the current week is partial, so only fully scored weeks
 * before playoff_week_start are used for the regular season.
 *
 * Toilet bowl games aren't counted as games, because in that bracket the winner is the team
 * that scored less. Its final is only used to name the toilet bowl winner.
 */
export function buildSeason(raw: RawSeason): SeasonHistory {
  const { league, users, rosters, matchupsByWeek, transactions, winnersBracket, losersBracket } = raw;
  const settings = league.settings;

  const keyByRoster = new Map(
    rosters.map((r) => [r.roster_id, r.owner_id ?? `open-${league.season}-${r.roster_id}`]),
  );
  const keyOf = (rosterId: number) => keyByRoster.get(rosterId) ?? `open-${league.season}-${rosterId}`;

  const usersById = new Map(users.map((u) => [u.user_id, u]));
  const teams: Record<string, TeamInfo> = {};
  for (const roster of rosters) {
    const user = roster.owner_id ? usersById.get(roster.owner_id) : undefined;
    teams[keyOf(roster.roster_id)] = {
      manager: user?.display_name ?? (roster.owner_id ? "Former manager" : "Open slot"),
      team: user?.metadata?.team_name?.trim() || null,
    };
  }

  const regularSeason: Line[] = rosters
    .map((r) => ({
      key: keyOf(r.roster_id),
      wins: r.settings.wins ?? 0,
      losses: r.settings.losses ?? 0,
      ties: r.settings.ties ?? 0,
      pointsFor: (r.settings.fpts ?? 0) + (r.settings.fpts_decimal ?? 0) / 100,
      pointsAgainst: (r.settings.fpts_against ?? 0) + (r.settings.fpts_against_decimal ?? 0) / 100,
    }))
    .filter((line) => line.wins + line.losses + line.ties > 0);

  const pointsFor = (rosterId: number, weeks: number[]) =>
    weeks.reduce((sum, week) => {
      const matchup = matchupsByWeek[week]?.find((m) => m.roster_id === rosterId);
      return sum + (matchup ? matchupPoints(matchup) : 0);
    }, 0);

  const games: Game[] = [];

  const complete = league.status === "complete";
  const lastScored = settings.last_scored_leg ?? (complete ? Infinity : (settings.leg ?? 1) - 1);
  const lastRegular = Math.min(lastScored, (settings.playoff_week_start ?? Infinity) - 1);
  for (const [weekKey, matchups] of Object.entries(matchupsByWeek)) {
    if (Number(weekKey) > lastRegular) continue;
    const pairs = new Map<number, Matchup[]>();
    for (const m of matchups) {
      if (m.matchup_id !== null) pairs.set(m.matchup_id, [...(pairs.get(m.matchup_id) ?? []), m]);
    }
    for (const [a, b] of pairs.values()) {
      if (!a || !b) continue;
      const [pointsA, pointsB] = [matchupPoints(a), matchupPoints(b)];
      games.push({
        phase: "regular",
        teamA: keyOf(a.roster_id),
        teamB: keyOf(b.roster_id),
        pointsA,
        pointsB,
        winner: pointsA === pointsB ? null : keyOf(pointsA > pointsB ? a.roster_id : b.roster_id),
      });
    }
  }

  const lastRound = Math.max(0, ...winnersBracket.map((g) => g.r));
  for (const g of winnersBracket) {
    if (g.t1 === null || g.t2 === null || g.w === null) continue;
    const weeks = roundWeeks(league, g.r, lastRound);
    games.push({
      phase: "playoff",
      teamA: keyOf(g.t1),
      teamB: keyOf(g.t2),
      pointsA: pointsFor(g.t1, weeks),
      pointsB: pointsFor(g.t2, weeks),
      winner: keyOf(g.w),
    });
  }

  const finalOf = (bracket: BracketGame[]): FinalResult | null => {
    const final = bracket.find((g) => g.p === 1);
    if (!final || final.w === null || final.l === null) return null;
    return { winner: keyOf(final.w), opponent: keyOf(final.l) };
  };

  const counts: Record<string, TransactionCounts> = {};
  for (const t of transactions) {
    // Failed waiver claims and commissioner moves aren't things the manager did.
    if (t.status !== "complete") continue;
    const field = ({ trade: "trades", waiver: "waivers", free_agent: "freeAgents" } as const)[t.type as string];
    if (!field) continue;
    for (const rosterId of t.roster_ids) {
      const key = keyOf(rosterId);
      counts[key] ??= { trades: 0, waivers: 0, freeAgents: 0 };
      counts[key][field]++;
    }
  }

  return {
    leagueId: league.league_id,
    previousLeagueId: league.previous_league_id,
    name: league.name.trim(),
    season: league.season,
    inProgress: !complete,
    teams,
    regularSeason,
    games,
    transactions: counts,
    champion: finalOf(winnersBracket),
    toiletBowl: finalOf(losersBracket),
  };
}

/** custom_points is a commissioner's override of the score. */
function matchupPoints(m: Matchup): number {
  return m.custom_points ?? m.points ?? 0;
}

/**
 * The weeks a playoff round is played over. Every league inspected has one-week rounds
 * (playoff_round_type 0). Types 1 (two-week final) and 2 (two weeks per round) are from
 * Sleeper's settings screen and haven't been checked against a real league.
 */
function roundWeeks(league: League, round: number, lastRound: number): number[] {
  const start = league.settings.playoff_week_start;
  if (start === undefined) return [];
  const type = league.settings.playoff_round_type ?? 0;
  if (type === 2) return [start + (round - 1) * 2, start + (round - 1) * 2 + 1];
  const week = start + round - 1;
  return type === 1 && round === lastRound ? [week, week + 1] : [week];
}

// --- Tables ---

export interface Line {
  key: string;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
}

function newLine(key: string): Line {
  return { key, wins: 0, losses: 0, ties: 0, pointsFor: 0, pointsAgainst: 0 };
}

function addResult(line: Line, team: string, points: number, against: number, winner: string | null) {
  if (winner === null) line.ties++;
  else if (winner === team) line.wins++;
  else line.losses++;
  line.pointsFor += points;
  line.pointsAgainst += against;
}

/** Adds lines for the same team together. */
export function mergeLines(lines: Line[]): Line[] {
  const merged = new Map<string, Line>();
  for (const line of lines) {
    const total = merged.get(line.key) ?? newLine(line.key);
    total.wins += line.wins;
    total.losses += line.losses;
    total.ties += line.ties;
    total.pointsFor += line.pointsFor;
    total.pointsAgainst += line.pointsAgainst;
    merged.set(line.key, total);
  }
  return [...merged.values()];
}

/** One line per team. */
export function standings(games: Game[]): Line[] {
  const lines = new Map<string, Line>();
  const lineFor = (key: string) => lines.get(key) ?? lines.set(key, newLine(key)).get(key)!;
  for (const g of games) {
    addResult(lineFor(g.teamA), g.teamA, g.pointsA, g.pointsB, g.winner);
    addResult(lineFor(g.teamB), g.teamB, g.pointsB, g.pointsA, g.winner);
  }
  return [...lines.values()];
}

/** One line per opponent, from the given team's side. */
export function headToHead(games: Game[], team: string): Line[] {
  const lines = new Map<string, Line>();
  const lineFor = (key: string) => lines.get(key) ?? lines.set(key, newLine(key)).get(key)!;
  for (const g of games) {
    if (g.teamA === team) addResult(lineFor(g.teamB), team, g.pointsA, g.pointsB, g.winner);
    else if (g.teamB === team) addResult(lineFor(g.teamA), team, g.pointsB, g.pointsA, g.winner);
  }
  return [...lines.values()];
}

/** Ties count as half a win. Returns a fraction from 0 to 1. */
export function winPct(line: Pick<Line, "wins" | "losses" | "ties">): number {
  const played = line.wins + line.losses + line.ties;
  return played === 0 ? 0 : (line.wins + line.ties / 2) / played;
}

export type SortKey = "wins" | "losses" | "ties" | "winPct" | "pointsFor" | "pointsAgainst";

/** Sorts by the chosen stat, then win percentage, then points for. */
export function sortLines<T extends Line>(lines: T[], key: SortKey, descending: boolean): T[] {
  const value = (line: T) => (key === "winPct" ? winPct(line) : line[key]);
  return [...lines].sort(
    (a, b) =>
      (descending ? value(b) - value(a) : value(a) - value(b)) ||
      winPct(b) - winPct(a) ||
      b.pointsFor - a.pointsFor,
  );
}

export function formatRecord(line: Pick<Line, "wins" | "losses" | "ties">): string {
  return line.ties ? `${line.wins}-${line.losses}-${line.ties}` : `${line.wins}-${line.losses}`;
}

/** The newest season's details for a team. Seasons are ordered newest first. */
export function latestTeamInfo(seasons: SeasonHistory[], key: string): TeamInfo {
  for (const season of seasons) {
    if (season.teams[key]) return season.teams[key];
  }
  return { manager: "Former manager", team: null };
}
