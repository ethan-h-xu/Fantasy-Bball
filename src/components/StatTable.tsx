"use client";

import { useState } from "react";
import { sortLines, winPct, type Line, type SortKey } from "@/lib/league-stats";

export interface StatRow extends Line {
  name: string;
  /** A second line under the name. */
  detail?: string | null;
}

const POINTS = new Intl.NumberFormat("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const COLUMNS: { key: SortKey; label: string; title: string; format: (row: StatRow) => string }[] = [
  { key: "wins", label: "W", title: "Wins", format: (r) => String(r.wins) },
  { key: "losses", label: "L", title: "Losses", format: (r) => String(r.losses) },
  { key: "ties", label: "T", title: "Ties", format: (r) => String(r.ties) },
  { key: "winPct", label: "Win %", title: "Win percentage", format: (r) => `${(winPct(r) * 100).toFixed(1)}%` },
  { key: "pointsFor", label: "PF", title: "Points for", format: (r) => POINTS.format(r.pointsFor) },
  { key: "pointsAgainst", label: "PA", title: "Points against", format: (r) => POINTS.format(r.pointsAgainst) },
];

/** A table that sorts by whichever stat's column heading is clicked. */
export function StatTable({ rows, nameHeading }: { rows: StatRow[]; nameHeading: string }) {
  const [sort, setSort] = useState<{ key: SortKey; descending: boolean }>({ key: "winPct", descending: true });

  // Most leagues never have a tie, so the column only appears when it has something to show.
  const columns = COLUMNS.filter((c) => c.key !== "ties" || rows.some((r) => r.ties > 0));
  const sorted = sortLines(rows, sort.key, sort.descending);

  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th className="num">#</th>
            <th>{nameHeading}</th>
            {columns.map((c) => {
              const active = sort.key === c.key;
              return (
                <th
                  key={c.key}
                  className="num"
                  aria-sort={active ? (sort.descending ? "descending" : "ascending") : "none"}
                >
                  <button
                    type="button"
                    className={active ? "sort-button active" : "sort-button"}
                    title={`Sort by ${c.title.toLowerCase()}`}
                    onClick={() => setSort({ key: c.key, descending: active ? !sort.descending : true })}
                  >
                    {active && (
                      <span className="sort-arrow" aria-hidden="true">
                        {sort.descending ? "▼" : "▲"}
                      </span>
                    )}
                    {c.label}
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr key={row.key}>
              <td className="num muted">{i + 1}</td>
              <td>
                {row.name}
                {row.detail && <div className="row-detail">{row.detail}</div>}
              </td>
              {columns.map((c) => (
                <td key={c.key} className={sort.key === c.key ? "num sorted" : "num"}>
                  {c.format(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
