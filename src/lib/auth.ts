import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getNbaState, getUserNbaLeagues, isLockIn } from "@/lib/sleeper";
import { createClient } from "@/lib/supabase/server";

// All checks of who is signed in, and how far through registration they are, live here.
//
// These read the request's cookies, so:
// - Call them from a component inside <Suspense>, not at the top level of a page or layout.
// - Don't call them inside `use cache`, and don't pass the email into a cached function:
//   cache keys are stored as plain text.
// - Call a require* function in each page and server action. Layouts don't re-render on
//   navigation, and the proxy is only a first layer.
//
// React's cache() lasts for one request, so an auth decision is never reused across requests.

export interface CurrentUser {
  id: string;
  email: string | null;
}

export interface Profile {
  sleeper_username: string;
  sleeper_user_id: string;
}

/** The verified signed-in user, or null. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  // getClaims() verifies the token. getSession() doesn't, so a forged cookie would pass.
  const { data } = await supabase.auth.getClaims();
  if (!data) return null;
  return { id: data.claims.sub, email: data.claims.email ?? null };
});

/** The signed-in user's profile, or null if they haven't entered a Sleeper username yet. */
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("sleeper_username, sleeper_user_id")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw new Error(`Could not load profile: ${error.message}`);
  return data;
});

/** IDs of the leagues the signed-in user follows. */
export const getFollowedLeagueIds = cache(async (): Promise<string[]> => {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.from("followed_leagues").select("league_id").eq("user_id", user.id);
  if (error) throw new Error(`Could not load followed leagues: ${error.message}`);
  return data.map((row) => row.league_id);
});

/** Sends signed-out users to the sign-in page. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  return user;
}

/** Also sends users without a Sleeper username to that step. */
export async function requireProfile(): Promise<{ user: CurrentUser; profile: Profile }> {
  const user = await requireUser();
  const profile = await getCurrentProfile();
  if (!profile) redirect("/onboarding/sleeper");
  return { user, profile };
}

/**
 * Also sends users to the league picker if they follow nothing but have Lock-In leagues
 * to choose from. Users with no Lock-In leagues get through, and see an empty dashboard.
 * If Sleeper is down this throws, so the user sees an error page and not a false
 * "you have no leagues" message.
 */
export async function requireOnboardedUser(): Promise<{
  user: CurrentUser;
  profile: Profile;
  followedLeagueIds: string[];
}> {
  const { user, profile } = await requireProfile();
  const followedLeagueIds = await getFollowedLeagueIds();

  if (followedLeagueIds.length === 0) {
    const { league_season: season } = await getNbaState();
    const leagues = await getUserNbaLeagues(profile.sleeper_user_id, season);
    if (leagues.some(isLockIn)) redirect("/onboarding/leagues");
  }

  return { user, profile, followedLeagueIds };
}
