import Link from "next/link";

/** Heading for a league's pages, and the links between them. */
export function LeagueTabs({
  leagueId,
  name,
  active,
}: {
  leagueId: string;
  name: string;
  active: "history" | "stats";
}) {
  const tabs = [
    { id: "history", label: "History", href: `/league/${leagueId}` },
    { id: "stats", label: "My Stats", href: `/league/${leagueId}/stats` },
  ];
  return (
    <>
      <p>
        <Link href="/leagues">← All leagues</Link>
      </p>
      <h2 className="league-name">{name}</h2>
      <nav className="subtabs" aria-label="League pages">
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={tab.href}
            className={tab.id === active ? "subtab active" : "subtab"}
            aria-current={tab.id === active ? "page" : undefined}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
