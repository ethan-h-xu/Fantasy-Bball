"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SearchForm({ defaultUsername = "", defaultSeason }: { defaultUsername?: string; defaultSeason: string }) {
  const router = useRouter();
  const [username, setUsername] = useState(defaultUsername);
  const [season, setSeason] = useState(defaultSeason);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = username.trim();
    if (!name) return;
    if (name.includes("@")) {
      setError("Sleeper's public API can't look up accounts by email. Enter your Sleeper username instead.");
      return;
    }
    setError(null);
    const params = new URLSearchParams({ season: season.trim() || defaultSeason });
    router.push(`/user/${encodeURIComponent(name)}?${params}`);
  }

  return (
    <form onSubmit={onSubmit}>
      <label htmlFor="username">Sleeper username</label>
      <div className="row">
        <input
          id="username"
          className="grow"
          placeholder="e.g. ethanxu"
          autoComplete="off"
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          aria-label="Season"
          placeholder="Season"
          inputMode="numeric"
          size={6}
          value={season}
          onChange={(e) => setSeason(e.target.value)}
        />
        <button type="submit">Find leagues</button>
      </div>
      <p className="hint">Sleeper&apos;s public API looks up accounts by username or user ID only. It has no email lookup.</p>
      {error && <p className="error">{error}</p>}
    </form>
  );
}
