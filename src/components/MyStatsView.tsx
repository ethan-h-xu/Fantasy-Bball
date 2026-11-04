"use client";

import { useState } from "react";
import { ALL_SEASONS, SeasonSelect } from "@/components/SeasonSelect";
import { StatTable, type StatRow } from "@/components/StatTable";
import {
  formatRecord,
  headToHead,
  latestTeamInfo,
  mergeLines,
  standings,
  type SeasonHistory,
} from "@/lib/league-stats";

type GameFilter = "all" | "regular" | "playoff";

export function MyStatsView({ seasons, userId }: { seasons: SeasonHistory[]; userId: string }) {
  const [selected, setSelected] = useState(ALL_SEASONS);
  const [gameFilter, setGameFilter] = useState<GameFilter>("all");
  const allSeasons = selected === ALL_SEASONS;
  // Seasons from before the user joined the league have nothing of theirs in them.
  const mySeasons = seasons.filter((s) => s.teams[userId]);
  const visible = allSeasons ? mySeasons : mySeasons.filter((s) => s.leagueId === selected);

  const counts = { trades: 0, waivers: 0, freeAgents: 0 };
  for (const season of visible) {
    const c = season.transactions[userId];
    counts.trades += c?.trades ?? 0;
    counts.waivers += c?.waivers ?? 0;
    counts.freeAgents += c?.freeAgents ?? 0;
  }

  const games = visible.flatMap((s) => s.games);
  const filtered = gameFilter === "all" ? games : games.filter((g) => g.phase === gameFilter);
  const rows: StatRow[] = headToHead(filtered, userId).map((line) => {
    const { manager, team } = latestTeamInfo(visible, line.key);
    return !allSeasons && team ? { ...line, name: team, detail: manager } : { ...line, name: manager };
  });

  // Per-game scores can disagree with the official results, so say so when they do here.
  const official = mergeLines(visible.flatMap((s) => s.regularSeason)).find((l) => l.key === userId);
  const perGame = standings(games.filter((g) => g.phase === "regular")).find((l) => l.key === userId);
  const recordsDiffer = official && perGame && formatRecord(official) !== formatRecord(perGame);

  return (
    <section>
      <div className="section-heading">
        <h2>{allSeasons ? "All seasons" : visible[0]?.season}</h2>
        <SeasonSelect seasons={mySeasons} value={selected} onChange={setSelected} />
      </div>

      <div className="stat-tiles">
        <Tile label="Trades" value={counts.trades} />
        <Tile label="Waiver claims" value={counts.waivers} />
        <Tile label="Free-agent pickups" value={counts.freeAgents} />
      </div>
      <p className="hint">Completed moves only. Failed waiver claims and commissioner moves aren&apos;t counted.</p>

      <div className="card">
        <div className="section-heading">
          <h3>Head-to-head</h3>
          <label className="select-label">
            Games
            <select value={gameFilter} onChange={(e) => setGameFilter(e.target.value as GameFilter)}>
              <option value="all">All games</option>
              <option value="regular">Regular season</option>
              <option value="playoff">Playoffs</option>
            </select>
          </label>
        </div>
        {rows.length > 0 ? (
          <StatTable rows={rows} nameHeading={allSeasons ? "Opponent" : "Opponent team"} />
        ) : (
          <p className="muted">No games to show.</p>
        )}
        <p className="hint">
          Select a column heading to sort. Sleeper doesn&apos;t publish official scores per game, so these use its
          per-game scores, which can differ from the official ones. Playoff wins and losses are official. Toilet bowl
          games aren&apos;t included.
        </p>
        {recordsDiffer && gameFilter !== "playoff" && (
          <p className="hint">
            Your official regular-season record here is {formatRecord(official)}, but these per-game scores add up to{" "}
            {formatRecord(perGame)}, so some regular-season games above may show the wrong winner.
          </p>
        )}
      </div>
    </section>
  );
}

function Tile({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat-tile">
      <div className="stat-tile-value">{value}</div>
      <div className="stat-tile-label">{label}</div>
    </div>
  );
}
