import Link from "next/link";
import { Suspense } from "react";
import { SearchForm } from "@/components/SearchForm";
import { getNbaState, getUser, getUserNbaLeagues, isLockIn } from "@/lib/sleeper";

export default function UserPage({ params, searchParams }: PageProps<"/user/[username]">) {
  return (
    <Suspense fallback={<p className="muted">Loading leagues…</p>}>
      <UserLeagues params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function UserLeagues({ params, searchParams }: Pick<PageProps<"/user/[username]">, "params" | "searchParams">) {
  const { username: rawUsername } = await params;
  const username = decodeURIComponent(rawUsername);
  const { season: seasonParam } = await searchParams;
  const season =
    typeof seasonParam === "string" && /^\d{4}$/.test(seasonParam)
      ? seasonParam
      : (await getNbaState()).league_season;

  const form = <SearchForm defaultUsername={username} defaultSeason={season} />;

  const user = await getUser(username);
  if (!user) {
    return (
      <>
        {form}
        <p className="error">No Sleeper user found for &ldquo;{username}&rdquo;.</p>
      </>
    );
  }

  const leagues = await getUserNbaLeagues(user.user_id, season);
  const lockIn = leagues.filter(isLockIn);
  const others = leagues.filter((l) => !isLockIn(l));

  let status: React.ReactNode;
  if (leagues.length === 0) {
    status = <p className="error">{user.display_name} has no NBA leagues in {season}.</p>;
  } else if (lockIn.length === 0) {
    status = (
      <p className="error">
        {user.display_name} has {leagues.length} NBA league(s) in {season}, but none are Lock-In.
      </p>
    );
  } else {
    status = <p>Found {lockIn.length} Lock-In league(s) for {user.display_name}. Select one.</p>;
  }

  return (
    <>
      {form}
      {status}
      {leagues.length > 0 && (
        <section>
          <h2>{season} NBA leagues</h2>
          <ul className="league-list">
            {lockIn.map((l) => (
              <li key={l.league_id}>
                <Link className="league-item" href={`/league/${l.league_id}`}>
                  <span>
                    {l.name} <span className="muted">· {l.total_rosters} teams</span>
                  </span>
                  <span className="tag">Lock-In</span>
                </Link>
              </li>
            ))}
            {others.map((l) => (
              <li key={l.league_id}>
                <div className="league-item disabled" title="Not a Lock-In league">
                  <span>
                    {l.name} <span className="muted">· {l.total_rosters} teams</span>
                  </span>
                  <span className="tag off">Other mode ({l.settings.game_mode ?? "?"})</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
