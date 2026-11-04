import Link from "next/link";

export function LeagueNotFound({ leagueId }: { leagueId: string }) {
  return (
    <>
      <p className="error">No NBA league found with ID {leagueId}.</p>
      <p>
        <Link href="/leagues">Back to League History</Link>
      </p>
    </>
  );
}
