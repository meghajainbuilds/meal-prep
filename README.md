# The Week's Table

A single-household meal-planning web app. Every Friday a scheduled job generates next week's menu, shopping list, and prep sessions from your own dietary rules. You open the app on Monday and the week is already there.

Planned content is public read-only, so the live URL is safe to share. Owner-only writes are enforced in the database, not the UI.

Built on the [build-it-yourself harness](https://github.com/meghajainbuilds/build-it-yourself-harness): foundation, publish, models, always-on.

## Why bother

This project treats your household's planning rules as the source of truth. A private requirements doc describes what one real week looks like, and a weekly job turns it into a complete week on its own: menu for Monday through Sunday, consolidated shopping list across all dishes, two batch prep sessions with cuts and times, photos reused from past weeks when ingredients repeat.

## What's inside

| Surface | What it does |
| --- | --- |
| Week | Mon–Sun grid of planned dishes; click any day to open it |
| Day | Five slots with photos, plate guidance, per-item "ate it" logging |
| Ingredients | Shopping list in three categories with per-item Have state and quantity |
| Prep | Two batch sessions — Sunday prep and Wednesday refresh — with chop / roast / cook groups |
| Recipes | Searchable grid of real recipes with ingredients, method, source, household adaptations |

Visitors see everything read-only. The owner signs in with a magic link to edit.

## The stack

| Account | What it does | Choice |
| --- | --- | --- |
| GitHub | Code and history | Public repo |
| Database | Weeks, menus, recipes, shopping, prep, eating logs | Supabase (Postgres + RLS) |
| Host | Static site + one serverless function | Netlify |
| Sign-in | Owner edit access | Supabase email magic link |
| AI model | Writes each week's menu, shopping, and prep | Anthropic Claude |
| Images | Generates dish and ingredient photos | OpenAI `gpt-image-2` |
| Always-on | Runs the three scheduled jobs | Mac launchd |

Edit access is enforced server-side by row-level security: visitors can read planned content but can't write anything, so the public URL stays safe to share.

## How a week gets built

1. **Friday 10:00** — a scheduled job reads your private requirements doc, the recipe catalog, and the past two weeks for variety. It asks the AI to plan Mon–Sun across five slots and inserts the week.
2. **Immediately after** — the same job reads the generated menu and asks the AI for a consolidated shopping list (fresh / pantry / alternatives) plus two prep sessions, reusing photos from past weeks where ingredient names repeat.
3. **Monday 8:00** — an upkeep job tidies state for the new week.
4. **Any time** — an image job backfills photos for recipes, shopping, or prep rows that don't have one yet.
5. **Open the live app** — change a dish, mark an ingredient Have, check off a prep item, log what you actually ate.

## Try it on your own household

### Option 1 — Let the harness recreate it (recommended for beginners)

If you haven't set up a project like this before, don't do the seven steps below. Install the [build-it-yourself harness](https://github.com/meghajainbuilds/build-it-yourself-harness) in Claude Code, point it at this repo, and let it recreate the whole thing: GitHub, Supabase, Netlify, the Mac schedules, the environment variables, the deploy.

```
/plugin marketplace add meghajainbuilds/build-it-yourself-harness
/plugin install build-it@build-it-yourself-harness
```

Then open an empty folder in Claude Code and say: `/build-it:start`, then "Clone this repo and set it up for me." The harness pauses only when it needs you to sign in to an account or enter a verification code.

Still write your own `.claude/requirements.md` (the gitignored dietary-rules doc), because the AI reads it on every weekly run and you don't want to inherit someone else's.

### Option 2 — Set it up yourself

If you'd rather drive each step by hand:

1. **Fork this repo.**
2. **Create a Supabase project.** Apply `supabase/schema.sql` via the Management API or the SQL editor.
3. **Create a Netlify site.** Set the environment variables listed in `.env.example`.
4. **Write your own `.claude/requirements.md`.** Copy `.claude/requirements.example.md` and fill in the rules that matter: dietary restrictions, slot schedule, protein rotation, cuisines, portion sizes, carb philosophy, anything else. Your copy is gitignored; the committed example is only the shape.
5. **Install the three Mac schedules.** `bash scripts/install-launchd.sh`.
6. **Generate your first week manually to confirm.** `cd jobs && node run.mjs generate-week`.
7. **Sign in to the live site** with the owner email you configured and start editing.

## Scheduled jobs

| Job | Schedule | What it does |
| --- | --- | --- |
| `heartbeat` | daily 6:00 | Proof of life — writes a row and calls the AI |
| `generate-week` | Fri 10:00 | Drafts next Monday's menu + shopping + prep |
| `monday-upkeep` | Mon 8:00 | Tidies state for the new week |

Logs land in `jobs/logs/<job>.log`. Status: `launchctl list \| grep com.<project>.`.

## What it costs

| Item | Cost |
| --- | --- |
| GitHub, Supabase, Netlify on free plans | $0 |
| AI usage for weekly generation and recipe enrichment | a few dollars a month |
| Image generation (one-time per unique dish or ingredient) | a few dollars total, free on reuse |
| Mac stays awake overnight | your power bill |

Prices as of November 2026; check each provider's pricing page.

## Design choices worth knowing

- **Private requirements doc is the source of truth.** The AI never invents constraints; it follows what's in `.claude/requirements.md`.
- **Automate over copy-paste.** Schema goes in through the Management API. Deploys go through the Netlify CLI with a token. The dashboard is a last resort.
- **Photos are always generated, never uploaded.** New rows get backfilled on the next image-job run; repeat ingredient names reuse the existing photo for free.
- **Public read, owner-only write.** Row-level security does the real work; the UI just hides the write affordances so visitors don't click dead ends.
- **One scheduled Friday run produces a complete week.** Menu, shopping, and prep ship together; no second step.

## Ground rules

- Secret values live in `.env` and provider dashboards. They stay out of chat and out of GitHub.
- Private data (what you actually ate) is protected by rules inside the database, not just in the UI.
- Anything that sends, deploys, or spends asks first.

## Not in scope

- Multi-user households. One account edits; everyone else reads.
- A native mobile app. The web view works on a phone.
- Meal-kit integrations, calorie tracking, nutrition scoring. The point is your household's own rules, not a scoreboard.
