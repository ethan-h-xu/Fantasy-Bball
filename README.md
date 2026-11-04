# Fantasy-Bball

Sleeper Lock-In League Viewer: a Next.js app. Sign in with a code sent to your email, enter your Sleeper username, and choose the NBA Lock-In leagues you want to follow. Open a league to see its full history: regular-season and postseason standings across all its seasons, each season's league winner and toilet bowl winner, and your own trades, waiver claims and head-to-head records.

Signed-in pages have a sidebar with six tabs. League History is the only one that works so far: My Teams, Rankings, Calculate, Waiver and Account are "under construction" placeholders.

Every page except the sign-in page requires an account.

## Set up Supabase

Accounts are stored in [Supabase](https://supabase.com).

1. Create a Supabase project.
2. Copy `.env.example` to `.env.local` and fill in the project URL and publishable key. The app doesn't need the secret key.
3. Run `supabase/migrations/20261104000000_create_profiles_and_followed_leagues.sql` in the SQL Editor.
4. Under **Authentication → Emails**, set up custom SMTP. Supabase's built-in email can't use edited templates, and it only reaches your project's team members.
5. Replace the body of both the **Magic Link** and **Confirm signup** templates so they send a code rather than a link:
   ```html
   <h2>Your sign-in code</h2>
   <p>Enter this code to sign in: {{ .Token }}</p>
   <p>This code expires in 10 minutes and can only be used once.</p>
   ```
6. Under **Authentication → Sign In / Providers → Email**, set **Email OTP Expiration** to `600` seconds.

## Run

```sh
npm install
npm run dev     # http://localhost:3000
```

Production build: `npm run build && npm start`.

## Structure

| Path | What it is |
|---|---|
| `src/proxy.ts` | Runs on each request: refreshes the session, and redirects by signed-in status |
| `src/lib/auth.ts` | Current user and profile, plus the `require*` guards used by pages and server actions |
| `src/lib/supabase/` | Supabase clients for the browser, the server and the proxy, plus table types |
| `src/lib/sleeper.ts` | The only code that talks to Sleeper: typed fetchers, cache lifetimes, Lock-In detection |
| `src/lib/league-history.ts` | Follows a league back through its past seasons, and caches a summary of each |
| `src/lib/league-stats.ts` | Turns a season's raw data into that summary, and adds summaries up into tables. Runs on the server and in the browser |
| `supabase/migrations/` | Database tables and row-level security policies |
| `src/components/SidebarNav.tsx` | The list of sidebar tabs and their icons |
| `src/components/Logo.tsx`, `src/app/icon.svg` | The logo, in the app and as the browser tab icon. Keep the two in step |
| `src/app/(setup)/` | Single-column layout for the sign-in page and the onboarding steps |
| `src/app/(setup)/page.tsx` | Sign-in page, which is also the landing page |
| `src/app/(setup)/onboarding/` | Sleeper username and league picker steps, and the server actions that save them |
| `src/app/(main)/` | Sidebar layout for the tabs |
| `src/app/(main)/leagues/page.tsx` | League History tab: followed leagues |
| `src/app/(main)/league/[leagueId]/page.tsx` | A league's standings and winners, for members of that league |
| `src/app/(main)/league/[leagueId]/stats/page.tsx` | The signed-in user's stats in that league |
| `src/app/(main)/{my-teams,rankings,calculate,waiver,account}/` | Placeholder tabs |

## Notes

- **Sign-in:** codes are sent and verified from the browser, because Supabase rate limits those calls per IP. Going through the server would make all users share one limit.
- **Protecting pages:** call a `require*` guard from `src/lib/auth.ts` in every page and server action, inside `<Suspense>`. The proxy is only a first layer, and layouts don't re-run on navigation.
- **Stored data:** `profiles` holds the Sleeper username and user ID, and `followed_leagues` holds league IDs. Email stays in Supabase's `auth.users`, and league details are read live from Sleeper.
- **Unverified usernames:** nothing proves a user owns the Sleeper username they enter, so anyone can enter any username and open that account's leagues. Those leagues are already public on Sleeper, but don't rely on league membership to protect private data.
- Sleeper is called from the server, and responses are cached with Next.js `"use cache"` and `cacheLife` (user lookups for hours, leagues and rosters for minutes, season summaries for weeks once a season is complete).
- **No email lookup:** Sleeper's public API only resolves usernames and user IDs.
- **Season history:** seasons are linked by `previous_league_id`, and teams are matched across seasons by Sleeper user ID, because roster IDs change hands. A past season is included even if it isn't Lock-In, since it's the same league.
- **Per-game scores aren't official:** in `/matchups/<week>`, `points` is the sum of `starters_points`. For some seasons it disagrees with the official totals on each roster, and sometimes with who won. In one league inspected, 2024 matched exactly and 2025 didn't, with 3 of 7 playoff games won by the team with fewer `points`. Sleeper's public API has no official per-game score. So regular-season standings come from roster totals and playoff results from the brackets. Only head-to-head records and playoff PF/PA use per-game scores, and the page says so.
- **Toilet bowl:** the winner is the winner of the `p: 1` game in `/losers_bracket`. In that bracket `w` is normally the team that scored less, so its games aren't counted in any record.
- **Lock-In detection:** Sleeper doesn't document a Lock-In flag. The app treats `settings.game_mode === 1` as Lock-In, based on observed leagues. To change it, edit `LOCK_IN_GAME_MODE` in `src/lib/sleeper.ts`.
- This uses Next.js 16, whose APIs differ from older versions. Check `node_modules/next/dist/docs/` before relying on older patterns (see `AGENTS.md`).
