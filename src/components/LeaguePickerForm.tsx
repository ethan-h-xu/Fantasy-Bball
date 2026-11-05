"use client";

import { useActionState } from "react";
import { saveFollowedLeagues } from "@/app/(setup)/onboarding/actions";
import type { LeagueChoice } from "@/lib/league-choices";

export function LeaguePickerForm({ choices }: { choices: LeagueChoice[] }) {
  const [state, action, pending] = useActionState(saveFollowedLeagues, {});

  return (
    <form action={action}>
      <ul className="league-list">
        {choices.map((choice) => (
          <li key={choice.seasons[0].leagueId}>
            <label className="league-item league-option">
              <span className="grow">
                {choice.name} <span className="muted">· {choice.totalRosters} teams</span>
              </span>
              {choice.newSeasonAvailable && <span className="tag">New season available</span>}
              <select name="league_id" defaultValue={choice.followedId ?? ""}>
                <option value="">Not following</option>
                {choice.seasons.map((s, i) => (
                  <option key={s.leagueId} value={s.leagueId}>
                    {s.season}
                    {i === 0 && choice.seasons.length > 1 ? " (newest)" : ""}
                  </option>
                ))}
              </select>
            </label>
          </li>
        ))}
      </ul>
      <p className="hint">Each season includes the history of the seasons before it.</p>
      <button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save leagues"}
      </button>
      {state.error && <p className="error">{state.error}</p>}
    </form>
  );
}
