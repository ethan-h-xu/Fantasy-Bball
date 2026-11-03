# Fantasy-Bball

Sleeper Lock-In League Viewer: a Next.js app. Enter a Sleeper username to list that user's NBA leagues for a season. Pick a Lock-In league to see its overview, standings, roster slots and scoring.

See [PLAN.md](PLAN.md) for the roadmap: accounts, Lock-In tools and deployment.

## Run

```sh
npm install
npm run dev     # http://localhost:3000
```

Production build: `npm run build && npm start`.

## Structure

| Path | What it is |
|---|---|
| `src/lib/sleeper.ts` | The only code that talks to Sleeper: typed fetchers, cache lifetimes, Lock-In detection |
| `src/app/page.tsx` | Home page with the search form |
| `src/app/user/[username]/page.tsx` | A user's NBA leagues for a season (`?season=2026`) |
| `src/app/league/[leagueId]/page.tsx` | League details |
| `src/components/SearchForm.tsx` | Username and season form (client component) |

## Notes

- Sleeper is called from the server, and responses are cached with Next.js `"use cache"` and `cacheLife` (user lookups for hours, leagues and rosters for minutes).
- **No email lookup:** Sleeper's public API only resolves usernames and user IDs.
- **Lock-In detection:** Sleeper doesn't document a Lock-In flag. The app treats `settings.game_mode === 1` as Lock-In, based on observed leagues. To change it, edit `LOCK_IN_GAME_MODE` in `src/lib/sleeper.ts`.
- This uses Next.js 16, whose APIs differ from older versions. Check `node_modules/next/dist/docs/` before relying on older patterns (see `AGENTS.md`).
