# Project map: meal-prep

**What it is:** Single-user meal-planning web app for Megha. Weekly plan (Mon-Sun, Seattle time) with ingredients, prep sessions, recipe library, and actual-eating logs. Owner-only edit; public read-only view of planned content (no personal/private data).
**Shape:** Agent with a dashboard
**Agent:** claude   **Updated:** 2026-10-30

## Blocks
- [x] foundation: https://github.com/meghajainbuilds/meal-prep , https://moajmtdzkcxabmkqflzf.supabase.co
- [x] publish: netlify, https://meal-prep-megha.netlify.app (site id 4cf9246b-652b-4786-8ef2-6df189d5c079)
- [x] models: agent claude, app anthropic claude-sonnet-5-5 via Netlify Function at /api/ai
- [ ] always-on: mac

## Auth
- Supabase email magic link (not Google). Owner: meghajain@outlook.com. Can swap to Google later.
- Supabase Site URL + Redirect allowlist include https://meal-prep-megha.netlify.app and http://localhost:5173.
- [-] messaging: not in scope (web app only)

## Controls
- Start / stop / status / logs: (set during always-on block)

## Settings (names only)
- SUPABASE_URL
- SUPABASE_PROJECT_REF
- SUPABASE_PUBLISHABLE_KEY
- SUPABASE_ACCESS_TOKEN (personal access token; used for CLI/API automation)
- SUPABASE_SERVICE_ROLE_KEY (server-side only, for scheduled jobs)
- NETLIFY_AUTH_TOKEN (personal access token; used for deploys)
- ANTHROPIC_API_KEY
- (app build-time) VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY

## Proven
- 2026-10-30: harness.config.json and MAP.md created, blocks chosen and confirmed by owner.
- 2026-10-30: Private GitHub repo meghajainbuilds/meal-prep created and initial commit pushed.
- 2026-10-30: Supabase project moajmtdzkcxabmkqflzf provisioned; schema v1 applied via Management API; 9 tables with RLS, 36 policies (public-read planned content, owner-only private tables).
- 2026-10-30: Netlify site meal-prep-megha created, dist/ deployed via API, team SSO + site visitor-access set to public. Supabase auth site_url + allowlist updated. Owner signed in via magic link and inserted a placeholder weeks row; public-read verified via REST; private tables correctly return [] unauth.
- 2026-10-30: Netlify Function /api/ai deployed; ANTHROPIC_API_KEY + AI_MODEL set as function env; smoke test "Say ok" returned "ok" via claude-sonnet-5-5. `claude -p "Say ok"` also OK.

## Open
- Visual + functional reference: https://one-week-kitchen-sample.misty-map-0388.chatgpt.site (ChatGPT-hosted). Match UI/features; depart only for stack choices (Supabase + Netlify).
- Owner identity: meghajain@outlook.com (Google sign-in).
- Build order after setup: Week view -> Day view -> Ingredients -> Prep sessions -> Recipes -> Actual-eating logs. One week first (Mon Oct 26 - Sun Nov 1, 2026).
- Scheduled jobs to configure in always-on: Friday draft generation; Monday 8am Seattle upkeep.
- "House manager" framing is dropped per owner. Prep sessions are for the single owner.
- Full requirements doc: pasted by owner on 2026-10-30; captured in memory `meal-prep-project` and will be re-stated in the Supabase schema design.
