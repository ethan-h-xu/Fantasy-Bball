"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentProfile, getFollowedLeagueIds, requireProfile, requireUser } from "@/lib/auth";
import { getLeagueChoices } from "@/lib/league-follows";
import { getUser } from "@/lib/sleeper";
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

  const { choices } = await getLeagueChoices(profile.sleeper_user_id, await getFollowedLeagueIds());

  // Only leagues the picker offers this user can be saved, whatever the form submitted.
  const submitted = new Set(formData.getAll("league_id").map(String));
  const leagueIds = choices
    .flatMap((choice) => choice.seasons.map((s) => s.leagueId))
    .filter((leagueId) => submitted.has(leagueId));
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
