import { formatRecord, type FinalResult, type SeasonHistory } from "@/lib/league-stats";

/** One card per finished season, with its league winner and toilet bowl winner. */
export function LeagueHonors({ seasons }: { seasons: SeasonHistory[] }) {
  const finished = seasons.filter((s) => s.champion || s.toiletBowl);
  if (finished.length === 0) return null;

  return (
    <section>
      <h2>League winners</h2>
      <div className="honors">
        {finished.map((season) => (
          <article key={season.leagueId} className="card honors-season">
            <h3>{season.season}</h3>
            {season.champion && <Honor title="League winner" season={season} result={season.champion} />}
            {season.toiletBowl && <Honor title="Toilet bowl winner" season={season} result={season.toiletBowl} />}
          </article>
        ))}
      </div>
    </section>
  );
}

function Honor({ title, season, result }: { title: string; season: SeasonHistory; result: FinalResult }) {
  const { manager, team } = season.teams[result.winner] ?? { manager: "Former manager", team: null };
  const opponent = season.teams[result.opponent];
  const record = season.regularSeason.find((line) => line.key === result.winner);
  return (
    <div className="honor">
      <div className="honor-title">{title}</div>
      <div className="honor-name">{team ?? manager}</div>
      <div className="muted">
        {team && `${manager} · `}
        {record && `${formatRecord(record)} in the regular season`}
      </div>
      {opponent && (
        <div className="muted">
          Final against {opponent.team ? `${opponent.team} (${opponent.manager})` : opponent.manager}
        </div>
      )}
    </div>
  );
}
