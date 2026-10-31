# Meal-prep project

Single-user meal-planning web app for Megha, built on the build-it-yourself-harness.

## Read first
- `MAP.md` — living project map: block state, admin URLs, next-session queue, known gotchas. **Always read before acting.**
- `harness.config.json` — chosen blocks and defaults.
- `~/.claude/projects/-Users-meghajain-Projects-Meal-prep/memory/MEMORY.md` — index of saved project memories (auto-loads).

## Repo layout
- `app/` — Vite + React + Tailwind v4 app, deployed to Netlify
- `app/netlify/functions/` — serverless functions (`ai.ts` wraps Anthropic)
- `jobs/` — Node ESM scripts for scheduled work (`run.mjs <job-name>`)
- `launchd/` — plists for the three scheduled jobs
- `scripts/` — install + wrapper scripts
- `supabase/` — schema SQL (source of truth; apply via Supabase Management API)

## Conventions
- Secrets: in `.env` (gitignored). Names also appear in `.env.example`.
- No houses-manager framing — owner clarified it's single-user. Use "prep sessions."
- The ChatGPT prototype at https://one-week-kitchen-sample.misty-map-0388.chatgpt.site is the visual + functional reference; depart only for stack choices (Supabase + Netlify).
- Automation over UI copy-paste. Fetch via API/CLI with a token when possible; dashboard clicking only when a real human consent step is required.
