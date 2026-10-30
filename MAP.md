# Project map: meal-prep

**What it is:** Single-user meal-planning web app for Megha. Weekly plan (Mon-Sun, Seattle time) with ingredients, prep sessions, recipe library, and actual-eating logs. Owner-only edit; public read-only view of planned content (no personal/private data).
**Shape:** Agent with a dashboard
**Agent:** claude   **Updated:** 2026-10-30

## Blocks
- [ ] foundation: <GitHub URL>, <Supabase project URL>
- [ ] publish: netlify, <live URL>
- [ ] models: agent claude, app anthropic claude-sonnet-5-5
- [ ] always-on: mac
- [-] messaging: not in scope (web app only)

## Controls
- Start / stop / status / logs: (set during always-on block)

## Settings (names only)
- SUPABASE_URL
- SUPABASE_PUBLISHABLE_KEY
- SUPABASE_SERVICE_ROLE_KEY (server-side only)
- ANTHROPIC_API_KEY
- GOOGLE_OAUTH_CLIENT_ID (via Supabase Auth)
- GOOGLE_OAUTH_CLIENT_SECRET (via Supabase Auth)

## Proven
- 2026-10-30: harness.config.json and MAP.md created, blocks chosen and confirmed by owner.

## Open
- Visual + functional reference: https://one-week-kitchen-sample.misty-map-0388.chatgpt.site (ChatGPT-hosted). Match UI/features; depart only for stack choices (Supabase + Netlify).
- Owner identity: meghajain@outlook.com (Google sign-in).
- Build order after setup: Week view -> Day view -> Ingredients -> Prep sessions -> Recipes -> Actual-eating logs. One week first (Mon Oct 26 - Sun Nov 1, 2026).
- Scheduled jobs to configure in always-on: Friday draft generation; Monday 8am Seattle upkeep.
- "House manager" framing is dropped per owner. Prep sessions are for the single owner.
- Full requirements doc: pasted by owner on 2026-10-30; captured in memory `meal-prep-project` and will be re-stated in the Supabase schema design.
