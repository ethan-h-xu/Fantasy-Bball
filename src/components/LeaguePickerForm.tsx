"use client";

import { useActionState } from "react";
import { saveFollowedLeagues } from "@/app/(setup)/onboarding/actions";

export interface LeagueOption {
  league_id: string;
  name: string;
  total_rosters: number;
}

export function LeaguePickerForm({ leagues, followedIds }: { leagues: LeagueOption[]; followedIds: string[] }) {
  const [state, action, pending] = useActionState(saveFollowedLeagues, {});

  return (
    <form action={action}>
      <ul className="league-list">
        {leagues.map((l) => (
          <li key={l.league_id}>
            <label className="league-item league-option">
              <input type="checkbox" name="league_id" value={l.league_id} defaultChecked={followedIds.includes(l.league_id)} />
              <span className="grow">
                {l.name} <span className="muted">· {l.total_rosters} teams</span>
              </span>
              <span className="tag">Lock-In</span>
            </label>
          </li>
        ))}
      </ul>
      <button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save leagues"}
      </button>
      {state.error && <p className="error">{state.error}</p>}
    </form>
  );
}
