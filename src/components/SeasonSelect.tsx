"use client";

import type { SeasonHistory } from "@/lib/league-stats";

export const ALL_SEASONS = "all";

/** Picks one season by league ID, or ALL_SEASONS. Seasons with no games yet aren't offered. */
export function SeasonSelect({
  seasons,
  value,
  onChange,
}: {
  seasons: SeasonHistory[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="select-label">
      Season
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value={ALL_SEASONS}>All seasons</option>
        {seasons
          .filter((s) => s.regularSeason.length > 0)
          .map((s) => (
            <option key={s.leagueId} value={s.leagueId}>
              {s.season}
              {s.inProgress ? " (in progress)" : ""}
            </option>
          ))}
      </select>
    </label>
  );
}
