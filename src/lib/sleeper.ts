import "server-only";
import { cacheLife } from "next/cache";

// All access to Sleeper's public, read-only API goes through this module.
// The API is undocumented, so field shapes here are based on observed responses.

const API = "https://api.sleeper.app/v1";

// --- Types (only the fields we use) ---

export interface SleeperUser {
  user_id: string;
  username: string;
  display_name: string;
  avatar: string | null;
  metadata?: { team_name?: string } | null;
}

export interface LeagueSettings {
  game_mode?: number;
  type?: number; // 0 redraft, 1 keeper, 2 dynasty
  leg?: number;
  num_teams?: number;
  playoff_teams?: number;
  playoff_week_start?: number;
  trade_deadline?: number;
  waiver_budget?: number;
  draft_rounds?: number;
  [key: string]: number | undefined;
}

export interface League {
  league_id: string;
  name: string;
  season: string;
  status: "pre_draft" | "drafting" | "in_season" | "complete" | string;
  sport: string;
  total_rosters: number;
  avatar: string | null;
  draft_id: string;
  previous_league_id: string | null;
  roster_positions: string[];
  settings: LeagueSettings;
  scoring_settings: Record<string, number>;
}

export interface Roster {
  roster_id: number;
  owner_id: string | null;
  players: string[] | null;
  starters: string[] | null;
  settings: {
    wins?: number;
    losses?: number;
    ties?: number;
    fpts?: number;
    fpts_decimal?: number;
    fpts_against?: number;
    fpts_against_decimal?: number;
  };
}

export interface NbaState {
  week: number;
  season: string;
  league_season: string;
  season_type: string;
}

// --- Lock-In detection ---

// Sleeper doesn't document a Lock-In flag. Every Lock-In league inspected had
// settings.game_mode === 1 (Lock-In is Sleeper's default for user-created leagues).
// Not yet confirmed against a non-Lock-In league.
const LOCK_IN_GAME_MODE = 1;

export function isLockIn(league: Pick<League, "settings">): boolean {
  return league.settings?.game_mode === LOCK_IN_GAME_MODE;
}

// --- Fetching ---

export class SleeperApiError extends Error {
  constructor(public status: number, path: string) {
    super(`Sleeper API returned ${status} for ${path}`);
  }
}

// Sleeper answers unknown users with `null` (200) and unknown leagues with `null` (404).
// Both become `null` here; other non-2xx responses throw.
async function get<T>(path: string): Promise<T | null> {
  const res = await fetch(API + path);
  if (res.status === 404) return null;
  if (!res.ok) throw new SleeperApiError(res.status, path);
  return res.json() as Promise<T | null>;
}

export async function getNbaState(): Promise<NbaState> {
  "use cache";
  cacheLife("minutes");
  const state = await get<NbaState>("/state/nba");
  if (!state) throw new Error("Sleeper returned no NBA state");
  return state;
}

/** Looks up a user by username or user ID. Returns null if not found. */
export async function getUser(usernameOrId: string): Promise<SleeperUser | null> {
  "use cache";
  cacheLife("hours");
  return get<SleeperUser>(`/user/${encodeURIComponent(usernameOrId)}`);
}

export async function getUserNbaLeagues(userId: string, season: string): Promise<League[]> {
  "use cache";
  cacheLife("minutes");
  const leagues = await get<League[]>(
    `/user/${encodeURIComponent(userId)}/leagues/nba/${encodeURIComponent(season)}`,
  );
  return leagues ?? [];
}

export async function getLeague(leagueId: string): Promise<League | null> {
  "use cache";
  cacheLife("minutes");
  return get<League>(`/league/${encodeURIComponent(leagueId)}`);
}

export async function getLeagueUsers(leagueId: string): Promise<SleeperUser[]> {
  "use cache";
  cacheLife("minutes");
  return (await get<SleeperUser[]>(`/league/${encodeURIComponent(leagueId)}/users`)) ?? [];
}

export async function getLeagueRosters(leagueId: string): Promise<Roster[]> {
  "use cache";
  cacheLife("minutes");
  return (await get<Roster[]>(`/league/${encodeURIComponent(leagueId)}/rosters`)) ?? [];
}

// --- Helpers ---

export function rosterPointsFor(r: Roster): number {
  return (r.settings.fpts ?? 0) + (r.settings.fpts_decimal ?? 0) / 100;
}
