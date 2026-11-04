import { Suspense } from "react";
import { LeagueHonors } from "@/components/LeagueHonors";
import { LeagueNotFound } from "@/components/LeagueNotFound";
import { LeagueTabs } from "@/components/LeagueTabs";
import { PageHeader } from "@/components/PageHeader";
import { StandingsView } from "@/components/StandingsView";
import { requireOnboardedUser } from "@/lib/auth";
import { getLeagueHistoryForMember } from "@/lib/league-history";
import { isLockIn } from "@/lib/sleeper";

export default function LeaguePage({ params }: PageProps<"/league/[leagueId]">) {
  return (
    <>
      <PageHeader title="League History" />
      <Suspense fallback={<p className="muted">Loading every season of this league…</p>}>
        <LeagueDetail params={params} />
      </Suspense>
    </>
  );
}

async function LeagueDetail({ params }: Pick<PageProps<"/league/[leagueId]">, "params">) {
  const { profile } = await requireOnboardedUser();
  const { leagueId } = await params;
  const history = await getLeagueHistoryForMember(leagueId, profile.sleeper_user_id);
  if (!history) return <LeagueNotFound leagueId={leagueId} />;
  const { league, seasons } = history;

  return (
    <>
      <LeagueTabs leagueId={leagueId} name={league.name} active="history" />
      {!isLockIn(league) && <p className="error">Note: this league doesn&apos;t appear to be a Lock-In league.</p>}
      <StandingsView seasons={seasons} />
      <LeagueHonors seasons={seasons} />
    </>
  );
}
