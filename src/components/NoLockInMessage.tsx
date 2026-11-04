export function NoLockInMessage({
  username,
  season,
  nbaLeagueCount,
}: {
  username: string;
  season: string;
  nbaLeagueCount: number;
}) {
  if (nbaLeagueCount === 0) {
    return <p>{username} has no NBA leagues in {season}, so there&apos;s nothing to follow yet.</p>;
  }
  return (
    <p>
      {username} has {nbaLeagueCount} NBA league{nbaLeagueCount === 1 ? "" : "s"} in {season}, but{" "}
      {nbaLeagueCount === 1 ? "it isn't" : "none are"} Lock-In, so there&apos;s nothing to follow yet.
    </p>
  );
}
