"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentProfile, requireProfile, requireUser } from "@/lib/auth";
import { getNbaState, getUser, getUserNbaLeagues, isLockIn } from "@/lib/sleeper";
import { createClient } from "@/lib/supabase/server";

export interface FormState {
  error?: string;
}

const SAVE_ERROR = "Couldn't save that. Please try again.";

export async function saveSleeperUsername(_previous: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();

  const username = String(formData.get("username") ?? "").trim();
  if (!username) return { error: "Enter your Sleeper username." };
  if (username.includes("@")) {
    return { error: "Sleeper can't look up accounts by email. Enter your Sleeper username instead." };
  }

  const sleeperUser = await getUser(username);
  if (!sleeperUser) return { error: `No Sleeper user found for "${username}".` };

  const supabase = await createClient();

  // Follows belong to the Sleeper account they were chosen for.
  const existing = await getCurrentProfile();
  if (existing && existing.sleeper_user_id !== sleeperUser.user_id) {
    const { error } = await supabase.from("followed_leagues").delete().eq("user_id", user.id);
    if (error) return { error: SAVE_ERROR };
  }

  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    sleeper_username: sleeperUser.username,
    sleeper_user_id: sleeperUser.user_id,
  });
  if (error) return { error: SAVE_ERROR };

  refresh();
  redirect("/onboarding/leagues");
}

export async function saveFollowedLeagues(_previous: FormState, formData: FormData): Promise<FormState> {
  const { user, profile } = await requireProfile();

  const { league_season: season } = await getNbaState();
  const leagues = await getUserNbaLeagues(profile.sleeper_user_id, season);

  // Only the user's own Lock-In leagues can be saved, whatever the form submitted.
  const submitted = new Set(formData.getAll("league_id").map(String));
  const leagueIds = leagues.filter((l) => isLockIn(l) && submitted.has(l.league_id)).map((l) => l.league_id);
  if (leagueIds.length === 0) return { error: "Select at least one league." };

  const supabase = await createClient();

  // Add before removing, so a failure between the two can't lose any follows.
  const { error: addError } = await supabase
    .from("followed_leagues")
    .upsert(
      leagueIds.map((league_id) => ({ user_id: user.id, league_id })),
      { ignoreDuplicates: true },
    );
  if (addError) return { error: SAVE_ERROR };

  const { error: removeError } = await supabase
    .from("followed_leagues")
    .delete()
    .eq("user_id", user.id)
    .not("league_id", "in", `(${leagueIds.map((id) => `"${id}"`).join(",")})`);
  if (removeError) return { error: SAVE_ERROR };

  refresh();
  redirect("/leagues");
}
