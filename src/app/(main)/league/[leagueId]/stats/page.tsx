import { Suspense } from "react";
import { LeagueNotFound } from "@/components/LeagueNotFound";
import { LeagueTabs } from "@/components/LeagueTabs";
import { MyStatsView } from "@/components/MyStatsView";
import { PageHeader } from "@/components/PageHeader";
import { requireOnboardedUser } from "@/lib/auth";
import { getLeagueHistoryForMember } from "@/lib/league-history";

export default function LeagueStatsPage({ params }: PageProps<"/league/[leagueId]/stats">) {
  return (
    <>
      <PageHeader title="League History" />
      <Suspense fallback={<p className="muted">Loading your stats…</p>}>
        <LeagueStats params={params} />
      </Suspense>
    </>
  );
}

async function LeagueStats({ params }: Pick<PageProps<"/league/[leagueId]/stats">, "params">) {
  const { profile } = await requireOnboardedUser();
  const { leagueId } = await params;
  const history = await getLeagueHistoryForMember(leagueId, profile.sleeper_user_id);
  if (!history) return <LeagueNotFound leagueId={leagueId} />;

  return (
    <>
      <LeagueTabs leagueId={leagueId} name={history.league.name} active="stats" />
      <MyStatsView seasons={history.seasons} userId={profile.sleeper_user_id} />
    </>
  );
}
