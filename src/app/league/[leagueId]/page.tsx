import Link from "next/link";
import { Suspense } from "react";
import { requireOnboardedUser } from "@/lib/auth";
import {
  getLeague,
  getLeagueRosters,
  getLeagueUsers,
  isLockIn,
  rosterPointsFor,
  type League,
  type Roster,
  type SleeperUser,
} from "@/lib/sleeper";

const LEAGUE_TYPES: Record<number, string> = { 0: "Redraft", 1: "Keeper", 2: "Dynasty" };
const STATUS_LABELS: Record<string, string> = {
  pre_draft: "Pre-draft",
  drafting: "Drafting",
  in_season: "In season",
  complete: "Complete",
};

export default function LeaguePage({ params }: PageProps<"/league/[leagueId]">) {
  return (
    <Suspense fallback={<p className="muted">Loading league…</p>}>
      <LeagueDetail params={params} />
    </Suspense>
  );
}

async function LeagueDetail({ params }: Pick<PageProps<"/league/[leagueId]">, "params">) {
  const { profile } = await requireOnboardedUser();
  const { leagueId } = await params;
  const [league, users] = await Promise.all([getLeague(leagueId), getLeagueUsers(leagueId)]);

  // Leagues the user isn't in get the same message as ones that don't exist.
  const isMember = users.some((u) => u.user_id === profile.sleeper_user_id);
  if (!league || league.sport !== "nba" || !isMember) {
    return (
      <>
        <p className="error">No NBA league found with ID {leagueId}.</p>
        <p>
          <Link href="/leagues">Back to your leagues</Link>
        </p>
      </>
    );
  }

  const rosters = await getLeagueRosters(leagueId);

  return (
    <>
      <p>
        <Link href="/leagues">← Your leagues</Link>
      </p>
      {!isLockIn(league) &&<p className="error">Note: this league doesn&apos;t appear to be a Lock-In league.</p>}
      <Overview league={league} />
      <Standings rosters={rosters} users={users} />
      <RosterSlots positions={league.roster_positions ?? []} />
      <Scoring scoring={league.scoring_settings ?? {}} />
    </>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="stat">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
    </div>
  );
}

function Overview({ league }: { league: League }) {
  const s = league.settings;
  return (
    <div className="card">
      <h2>{league.name}</h2>
      <div className="grid">
        <Stat label="Season" value={league.season} />
        <Stat label="Status" value={STATUS_LABELS[league.status] ?? league.status} />
        <Stat label="Teams" value={league.total_rosters} />
        <Stat label="League type" value={s.type != null ? (LEAGUE_TYPES[s.type] ?? `Unknown (${s.type})`) : "–"} />
        <Stat label="Current week" value={s.leg ?? "–"} />
        <Stat label="Playoffs" value={`${s.playoff_teams ?? "?"} teams, from week ${s.playoff_week_start ?? "?"}`} />
        <Stat label="Trade deadline" value={s.trade_deadline ? `Week ${s.trade_deadline}` : "None"} />
        <Stat label="FAAB budget" value={s.waiver_budget != null ? `$${s.waiver_budget}` : "–"} />
        <Stat label="Draft rounds" value={s.draft_rounds ?? "–"} />
      </div>
    </div>
  );
}

function Standings({ rosters, users }: { rosters: Roster[]; users: SleeperUser[] }) {
  const usersById = new Map(users.map((u) => [u.user_id, u]));
  const sorted = [...rosters].sort(
    (a, b) => (b.settings.wins ?? 0) - (a.settings.wins ?? 0) || rosterPointsFor(b) - rosterPointsFor(a),
  );
  return (
    <div className="card">
      <h3>Standings</h3>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Team</th>
            <th>Manager</th>
            <th className="num">W-L-T</th>
            <th className="num">Points For</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r, i) => {
            const u = r.owner_id ? usersById.get(r.owner_id) : undefined;
            const st = r.settings;
            return (
              <tr key={r.roster_id}>
                <td>{i + 1}</td>
                <td>{u?.metadata?.team_name || u?.display_name || "(open slot)"}</td>
                <td>{u?.display_name ?? "–"}</td>
                <td className="num">{`${st.wins ?? 0}-${st.losses ?? 0}-${st.ties ?? 0}`}</td>
                <td className="num">{rosterPointsFor(r).toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function RosterSlots({ positions }: { positions: string[] }) {
  const counts = new Map<string, number>();
  for (const p of positions) counts.set(p, (counts.get(p) ?? 0) + 1);
  return (
    <div className="card">
      <h3>Roster slots</h3>
      <div className="chips">
        {[...counts].map(([pos, n]) => (
          <span key={pos} className="chip">
            {n > 1 ? `${pos} ×${n}` : pos}
          </span>
        ))}
      </div>
    </div>
  );
}

function Scoring({ scoring }: { scoring: Record<string, number> }) {
  const entries = Object.entries(scoring).filter(([, v]) => v !== 0);
  return (
    <div className="card">
      <h3>Scoring</h3>
      <div className="chips">
        {entries.map(([k, v]) => (
          <span key={k} className="chip">
            {k}: {v > 0 ? "+" : ""}
            {v}
          </span>
        ))}
      </div>
    </div>
  );
}
