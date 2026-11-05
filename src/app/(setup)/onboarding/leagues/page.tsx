import Link from "next/link";
import { Suspense } from "react";
import { LeaguePickerForm } from "@/components/LeaguePickerForm";
import { NoLockInMessage } from "@/components/NoLockInMessage";
import { getFollowedLeagueIds, requireProfile } from "@/lib/auth";
import { getLeagueChoices } from "@/lib/league-follows";

export default function OnboardingLeaguesPage() {
  return (
    <>
      <h2>Choose your leagues</h2>
      <Suspense fallback={<p className="muted">Loading your leagues…</p>}>
        <LeagueStep />
      </Suspense>
    </>
  );
}

async function LeagueStep() {
  const { profile } = await requireProfile();
  const followedIds = await getFollowedLeagueIds();
  const { season, nbaLeagueCount, choices } = await getLeagueChoices(profile.sleeper_user_id, followedIds);

  const changeUsername = (
    <Link href="/onboarding/sleeper">Change Sleeper username</Link>
  );

  if (choices.length === 0) {
    return (
      <>
        <NoLockInMessage username={profile.sleeper_username} season={season} nbaLeagueCount={nbaLeagueCount} />
        <p>
          <Link href="/leagues">Continue to dashboard</Link> · {changeUsername}
        </p>
      </>
    );
  }

  return (
    <>
      <p>Choose the Lock-In leagues {profile.sleeper_username} wants to follow, and which season of each.</p>
      <LeaguePickerForm choices={choices} />
      <p className="hint">{changeUsername}</p>
    </>
  );
}
