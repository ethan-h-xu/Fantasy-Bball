import Link from "next/link";
import { Suspense } from "react";
import { LeaguePickerForm } from "@/components/LeaguePickerForm";
import { NoLockInMessage } from "@/components/NoLockInMessage";
import { getFollowedLeagueIds, requireProfile } from "@/lib/auth";
import { getNbaState, getUserNbaLeagues, isLockIn } from "@/lib/sleeper";

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
  const { league_season: season } = await getNbaState();
  const [leagues, followedIds] = await Promise.all([
    getUserNbaLeagues(profile.sleeper_user_id, season),
    getFollowedLeagueIds(),
  ]);
  const lockIn = leagues.filter(isLockIn);

  const changeUsername = (
    <Link href="/onboarding/sleeper">Change Sleeper username</Link>
  );

  if (lockIn.length === 0) {
    return (
      <>
        <NoLockInMessage username={profile.sleeper_username} season={season} nbaLeagueCount={leagues.length} />
        <p>
          <Link href="/leagues">Continue to dashboard</Link> · {changeUsername}
        </p>
      </>
    );
  }

  return (
    <>
      <p>Select the {season} Lock-In leagues {profile.sleeper_username} wants to follow.</p>
      <LeaguePickerForm
        leagues={lockIn.map(({ league_id, name, total_rosters }) => ({ league_id, name, total_rosters }))}
        followedIds={followedIds}
      />
      <p className="hint">{changeUsername}</p>
    </>
  );
}
