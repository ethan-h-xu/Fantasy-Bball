# Plan: Sleeper NBA Lock-In App

Goal: turn the static MVP into a deployed app with user accounts and Lock-In-specific features.

## Stack

| Layer | Choice | Why |
|---|---|---|
| App | Next.js (TypeScript, App Router) | Pages and server code in one project |
| Hosting | Vercel | Free tier, deploys on every git push, preview links for each branch |
| Accounts and database | Supabase (Postgres + Auth) | Email and Google login; per-user access rules enforced by the database |
| Background jobs | Vercel Cron or Supabase scheduled functions | Refresh Sleeper data and send reminders |

## Linking accounts to Sleeper

Sleeper has no "Log in with Sleeper," so the app can't prove someone owns a Sleeper username.

1. **Trust the link (start here).** League data is public anyway.
2. **Verify later if needed.** Before any feature acts on someone's behalf, ask them to temporarily set their Sleeper team name to a code the app generates, then check it through the API.

## Phases

### Phase 0: Foundation
- [x] Move to Next.js + TypeScript and port the MVP page
- [x] Put all Sleeper calls in one typed module, `src/lib/sleeper.ts`, with the Lock-In check in one function
- [x] Call Sleeper from the server and cache responses (`"use cache"` + `cacheLife`)
- [ ] Deploy to Vercel (needs your Vercel account: connect the GitHub repo at vercel.com/new)

Moved to Phase 2: downloading the player list (`/players/nba`) once a day. Nothing uses player data until the matchup view.

### Phase 1: Accounts
- [ ] Supabase Auth with email link and Google sign-in
- [ ] Tables: `profiles` (user ↔ linked Sleeper user ID), `followed_leagues`, `preferences`
- [ ] Dashboard: after login, go straight to "your Lock-In leagues"

### Phase 2: Lock-In features
- [ ] Weekly matchup view (`/league/{id}/matchups/{week}`, confirmed working for NBA leagues)
- [ ] Lock decision helper: for each starter, games remaining this week, best score so far, and whether to lock now or wait
- [ ] Deadline reminders by email or push before a player's next game

### Phase 3: League-level extras
- [ ] Standings history and power rankings
- [ ] Transactions feed
- [ ] Head-to-head records
- [ ] Season recaps

### Phase 4: Hardening
- [ ] Error tracking (Sentry)
- [ ] Rate-limit handling and backoff for Sleeper (their guidance is under ~1000 calls per minute)
- [ ] Tests for the Sleeper module, using recorded API responses
- [ ] Privacy page, plus a note that the app isn't affiliated with Sleeper

## Risks
- **Undocumented API.** Sleeper's API is unofficial, so fields can change without notice. All Sleeper access stays in `lib/sleeper.ts` to limit the damage.
- **Missing game data.** Schedules and live game times aren't in Sleeper's public API. The lock helper may need a separate NBA schedule source.
- **Unconfirmed Lock-In flag.** `settings.game_mode === 1` is inferred from observed leagues and still needs testing against a non-Lock-In league.
