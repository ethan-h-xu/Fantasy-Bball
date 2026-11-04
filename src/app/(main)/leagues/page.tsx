import Link from "next/link";
import { Suspense } from "react";
import { NoLockInMessage } from "@/components/NoLockInMessage";
import { PageHeader } from "@/components/PageHeader";
import { requireOnboardedUser, type Profile } from "@/lib/auth";
import { getLeague, getNbaState, getUserNbaLeagues } from "@/lib/sleeper";

export default function LeaguesPage() {
  return (
    <>
      <PageHeader title="League History" subtitle="Your NBA Lock-In leagues" />
      <Suspense fallback={<p className="muted">Loading your leagues…</p>}>
        <Dashboard />
      </Suspense>
    </>
  );
}

async function Dashboard() {
  const { profile, followedLeagueIds } = await requireOnboardedUser();

  if (followedLeagueIds.length === 0) return <EmptyDashboard profile={profile} />;

  const leagues = await Promise.all(followedLeagueIds.map(getLeague));

  return (
    <>
      <ul className="league-list">
        {followedLeagueIds.map((id, i) => {
          const league = leagues[i];
          if (!league) {
            return (
              <li key={id}>
                <div className="league-item disabled">
                  <span>League {id}</span>
                  <span className="tag off">No longer on Sleeper</span>
                </div>
              </li>
            );
          }
          return (
            <li key={id}>
              <Link className="league-item" href={`/league/${id}`}>
                <span>
                  {league.name} <span className="muted">· {league.total_rosters} teams · {league.season}</span>
                </span>
                <span className="tag">Lock-In</span>
              </Link>
            </li>
          );
        })}
      </ul>
      <p>
        <Link href="/onboarding/leagues">Edit leagues</Link> ·{" "}
        <Link href="/onboarding/sleeper">Change Sleeper username</Link>
      </p>
    </>
  );
}

async function EmptyDashboard({ profile }: { profile: Profile }) {
  const { league_season: season } = await getNbaState();
  const leagues = await getUserNbaLeagues(profile.sleeper_user_id, season);

  return (
    <>
      <NoLockInMessage username={profile.sleeper_username} season={season} nbaLeagueCount={leagues.length} />
      <p className="muted">When {profile.sleeper_username} joins a Lock-In league, you can choose to follow it here.</p>
      <p>
        <Link href="/onboarding/sleeper">Change Sleeper username</Link>
      </p>
    </>
  );
}
