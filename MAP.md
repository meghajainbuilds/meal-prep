# Project map: meal-prep

**What it is:** Single-user meal-planning web app for Megha. Weekly plan (Mon-Sun, Seattle time) with ingredients, prep sessions, recipe library, and actual-eating logs. Owner-only edit; public read-only view of planned content (no personal/private data).
**Shape:** Agent with a dashboard
**Agent:** claude   **Updated:** 2026-10-30

## Blocks
- [x] foundation: https://github.com/meghajainbuilds/meal-prep , https://moajmtdzkcxabmkqflzf.supabase.co
- [x] publish: netlify, https://meal-prep-megha.netlify.app (site id 4cf9246b-652b-4786-8ef2-6df189d5c079)
- [x] models: agent claude, app anthropic claude-sonnet-5-5 via Netlify Function at /api/ai
- [x] always-on: mac — 3 launchd schedules installed under ~/Library/LaunchAgents/com.megha.mealprep.*.plist
  - heartbeat: daily 6:00 Seattle (proof of life)
  - generate-week: Fri 10:00 Seattle (next-Monday draft)
  - monday-upkeep: Mon 8:00 Seattle (stub; fills in with planner UI)

## Planner UI (built on top of the harness)
- [x] Design system: Fraunces (display) + Inter (body); cream `#f3efe4`, forest green `#1f3f2d`, terracotta `#a84a26`, sage `#e4e8d4`. Tokens in `app/src/index.css` under `@theme`.
- [x] Shell: `app/src/App.tsx` + `components/Header`, `Intro`, `Nav`, `Logo`. Router in `main.tsx`.
- [x] Week view (`views/Week.tsx`): Mon-Sun rows, Breakfast/Lunch/Dinner columns, dish chips.
- [x] Recipes view (`views/Recipes.tsx`): card grid reading from recipes table.
- [x] Day view (`views/Day.tsx`): 7-day pill selector, 5-slot timeline with time rail + dots, per-slot `MealCard` (dishes + MY PLATE sage box + ate-it toggle + "+ Add dish"), day toolbar ("+ Add planned meal", "Apply a sample menu"), `PlannedEstimate` sidebar (counts + tag composition + per-slot summary; no fake calories). AddDishModal (recipe search + custom), SampleMenuPicker (3 templates, wipes + rewrites one day).
- [x] Ingredients view (`views/Ingredients.tsx`): 3 collapsible categories (Fresh / Pantry / Alternatives) with "All ingredients" vs "Check / buy only" filter, "N marked Have · M to check" counter (excludes Alternatives), Expand/Collapse all, Print list, per-row image + name + editable quantity + Have checkbox + USED IN chips. Writes to `shopping_items`.
- [x] Prep view (`views/Prep.tsx`): session tabs (Sunday prep + Wednesday refresh) with completion counts, 3 numbered groups per session (Chop/Roast/Cook), per-row done checkbox + inline Edit + Move-to-other-session + Remove, "+ Add item" per group, right-rail Session notes textarea + per-group progress. Writes to `prep_items` (added `done boolean`) and `prep_sessions`.
- [x] Dish & ingredient photography: `jobs/jobs/generate-images.mjs` calls OpenAI `gpt-image-2` (defaults: low quality, 1024x1024), uploads to Supabase Storage bucket `food-images` at `{kind}/{id}.png`, writes `publicUrl` back to `recipes.image_url` / `shopping_items.image_url` / `prep_items.image_url`. Flags: `--limit N` (default 5), `--only recipes|shopping|prep`, `--all` (regenerate all). Dedupes by name across weeks (shopping) and by (ingredient, action, cut_style) across sessions (prep), so repeated items reuse existing images without regenerating. All existing seed data (99 items) generated 2026-10-30 at low quality.
- Seed: `cd jobs && node run.mjs seed-week-1` → recipes + meal plan. `node run.mjs seed-shopping-1` → 56 shopping_items for Oct 26. `node run.mjs seed-prep-1` → 2 prep_sessions + 24 prep_items for Oct 26.

## Auth
- Supabase email magic link (not Google). Owner: meghajain@outlook.com. Can swap to Google later.
- Supabase Site URL + Redirect allowlist include https://meal-prep-megha.netlify.app and http://localhost:5173.
- [-] messaging: not in scope (web app only)

## Controls
- Run a job manually: `cd jobs && node run.mjs <heartbeat|generate-week|monday-upkeep>`
- Status (all schedules): `launchctl list | grep com.megha.mealprep`
- Logs: `tail -f jobs/logs/<job>.log` (also `jobs/logs/launchd.<job>.err` for launchd-level failures)
- Reload all schedules: `bash scripts/install-launchd.sh`
- Unload one: `launchctl bootout "gui/$UID/com.megha.mealprep.<job>"`
- Deploy app: `source .env && cd app && npx netlify-cli deploy --prod --dir=dist --functions=netlify/functions --site 4cf9246b-652b-4786-8ef2-6df189d5c079 --auth "$NETLIFY_AUTH_TOKEN"` (pass `--auth` explicitly; env var alone is ignored by recent netlify-cli versions)
- Energy settings (required so schedules fire): System Settings → Battery → Options → "Prevent automatic sleeping on power adapter when the display is off" ON; "Wake for network access" ON. Stay signed in.

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
- 2026-10-30: jobs/ scaffold with env + db (service-role) + claude helpers. heartbeat ran end-to-end (DB + Claude). generate-week inserted week 2026-11-02 v1 as a dry-run. monday-upkeep stub returns. All 3 launchd plists installed via scripts/install-launchd.sh and visible in launchctl list.
- 2026-10-30: Planner UI v1 shipped — design system, shell, Week view, Recipes grid, placeholder tabs for Day/Ingredients/Prep. 21 recipes + 63 meal plan items seeded for 2026-10-26 week. Live at https://meal-prep-megha.netlify.app.
- 2026-10-30: Day view v1 shipped — 5-slot timeline, MealCard with MY PLATE + ate-it, AddDishModal, SampleMenuPicker (3 templates), PlannedEstimate sidebar. Writes to meal_plan_items (plan) and actual_eating_log (private ate-it, keyed by sentinel `__slot__`). Deployed via Netlify CLI.
- 2026-10-30: getLatestWeek() fixed to skip empty weeks (previously returned the Friday-stub 2026-11-02 week with 0 items, making Week view blank).
- 2026-10-30: Ingredients view v1 shipped — 3 collapsible categories, filter toggle, Have/quantity edit, USED IN chips. 56 shopping_items seeded for Oct 26 week via `seed-shopping-1`.
- 2026-10-30: Prep view v1 shipped — session tabs with done counts, Chop/Roast/Cook groups, inline edit, Move-to-session, Remove, Add item, session notes textarea. Added `prep_items.done boolean` via Management API migration. 2 sessions + 24 items seeded via `seed-prep-1`.
- 2026-10-30: Image gen pipeline shipped and run — 99/99 images generated via OpenAI `gpt-image-2` quality=low (19 recipes + 56 shopping + 24 prep). Stored in Supabase Storage bucket `food-images`, URLs written to each row's `image_url`. Deduplication by name across weeks (shopping) and by (name, action, cut_style) (prep) so repeated items reuse existing images for free. Views already read `image_url` with initial-letter fallback.
- 2026-10-30: Security hardening deployed — new `is_owner()` SQL function matches JWT email; writes on planned-content tables (recipes, weeks, meal_plan_items, shopping_items, prep_sessions, prep_items) now require `is_owner()` (previously any authenticated user). `/api/ai` now 401s unless Bearer JWT email matches owner. `actual_eating_log` reads opened to public (writes still owner-only) so visitors see full demo experience. App shows a sage read-only banner to signed-in non-owners pointing at the GitHub repo.

## Admin URLs
- Live app: https://meal-prep-megha.netlify.app
- GitHub repo: https://github.com/meghajainbuilds/meal-prep
- Supabase dashboard: https://supabase.com/dashboard/project/moajmtdzkcxabmkqflzf
- Netlify site admin: https://app.netlify.com/projects/meal-prep-megha
- Anthropic console: https://console.anthropic.com/
- Visual + functional reference: https://one-week-kitchen-sample.misty-map-0388.chatgpt.site

## Next-session queue (in order)
1. Recipes view polish — category chip filters, favorites heart, search, "Recipe & source" link.
2. Day view polish — proper modal confirm instead of `window.confirm` for Apply menu; migrate MY PLATE off `custom_notes` seam.
3. Ingredients polish — "+ Add ingredient" button; drag-sort within a category; print-only stylesheet.
4. Prep polish — reorder within a group (drag or up/down), maybe timers.
5. Real logic for generate-week + monday-upkeep (currently stubs).
6. Owner-aware UI gating — hide/disable write buttons for non-owner visitors (currently they can still click; writes just fail silently via RLS).

## Known gotchas (don't re-discover)
- Netlify: Team Access Controls / Visitor access can block public reads. Must be "Public" at both team and site level.
- Supabase: Management API with PAT can run arbitrary SQL via POST /v1/projects/{ref}/database/query. Use for all schema changes; don't send Megha to the SQL Editor UI.
- Supabase: secret key must be fetched from dashboard (`sb_secret_...`); Management API returns it masked.
- Node is nvm-managed. launchd plists use `scripts/run-job.sh` which sources nvm, don't hard-code node path.
- All deploys are direct uploads via Netlify CLI with NETLIFY_AUTH_TOKEN env var. GitHub-triggered auto-deploys are NOT wired up.

## Open decisions
- Owner-provided vs. AI-generated dish photos.
- Keep "The Week's Table" name or rename.
- Nav tab visual (terracotta top rule + green underline) matches prototype — pending owner review.
