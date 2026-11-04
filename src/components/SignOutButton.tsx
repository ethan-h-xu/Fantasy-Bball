"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function onClick() {
    setPending(true);
    setFailed(false);
    try {
      // "local" signs out this browser only, not the user's other devices.
      const { error } = await createClient().auth.signOut({ scope: "local" });
      if (error) throw error;
      // A full page load clears the browser's router cache, so no signed-in pages linger.
      window.location.replace("/");
    } catch {
      setFailed(true);
      setPending(false);
    }
  }

  return (
    <>
      <button type="button" className="link-button" disabled={pending} onClick={onClick}>
        {pending ? "Signing out…" : "Sign out"}
      </button>
      {failed && <span className="error">Couldn&apos;t sign out. Please try again.</span>}
    </>
  );
}
