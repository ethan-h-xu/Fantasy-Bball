"use client";

import { useState } from "react";
import { ALL_SEASONS, SeasonSelect } from "@/components/SeasonSelect";
import { StatTable, type StatRow } from "@/components/StatTable";
import { latestTeamInfo, mergeLines, standings, type Line, type SeasonHistory } from "@/lib/league-stats";

export function StandingsView({ seasons }: { seasons: SeasonHistory[] }) {
  const [selected, setSelected] = useState(ALL_SEASONS);
  const allSeasons = selected === ALL_SEASONS;
  const visible = allSeasons ? seasons : seasons.filter((s) => s.leagueId === selected);

  // Team names change every season, so across seasons a row is just its manager.
  const toRow = (line: Line): StatRow => {
    const { manager, team } = latestTeamInfo(visible, line.key);
    return !allSeasons && team ? { ...line, name: team, detail: manager } : { ...line, name: manager };
  };

  const regular = mergeLines(visible.flatMap((s) => s.regularSeason)).map(toRow);
  const postseason = standings(visible.flatMap((s) => s.games).filter((g) => g.phase === "playoff")).map(toRow);
  const nameHeading = allSeasons ? "Manager" : "Team";

  return (
    <section>
      <div className="section-heading">
        <h2>Standings</h2>
        <SeasonSelect seasons={seasons} value={selected} onChange={setSelected} />
      </div>
      <p className="hint">Select a column heading to sort by that stat.</p>
      <div className="card">
        <h3>Regular season</h3>
        {regular.length > 0 ? (
          <StatTable rows={regular} nameHeading={nameHeading} />
        ) : (
          <p className="muted">No regular-season games have been played yet.</p>
        )}
      </div>
      <div className="card">
        <h3>Postseason</h3>
        {postseason.length > 0 ? (
          <>
            <StatTable rows={postseason} nameHeading={nameHeading} />
            <p className="hint">
              Winners bracket only, not the toilet bowl. Wins and losses are official. PF and PA use Sleeper&apos;s
              per-game scores, which can differ from the official scores.
            </p>
          </>
        ) : (
          <p className="muted">No postseason games have been played yet.</p>
        )}
      </div>
    </section>
  );
}
