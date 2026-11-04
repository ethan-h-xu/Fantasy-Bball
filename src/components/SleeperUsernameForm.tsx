"use client";

import { useActionState } from "react";
import { saveSleeperUsername } from "@/app/onboarding/actions";

export function SleeperUsernameForm({ defaultUsername = "" }: { defaultUsername?: string }) {
  const [state, action, pending] = useActionState(saveSleeperUsername, {});

  return (
    <form action={action}>
      <label htmlFor="username">Sleeper username</label>
      <div className="row">
        <input
          id="username"
          name="username"
          className="grow"
          autoComplete="off"
          required
          autoFocus
          defaultValue={defaultUsername}
        />
        <button type="submit" disabled={pending}>
          {pending ? "Checking…" : "Continue"}
        </button>
      </div>
      <p className="hint">We use this to find your NBA Lock-In leagues on Sleeper.</p>
      {state.error && <p className="error">{state.error}</p>}
    </form>
  );
}
