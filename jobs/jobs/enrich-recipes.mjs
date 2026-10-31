import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { db } from '../db.mjs'
import { ask } from '../claude.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const REQ_PATH = resolve(here, '..', '..', '.claude', 'requirements.md')

export default async function main() {
  if (!existsSync(REQ_PATH)) {
    throw new Error(`Requirements doc not found at ${REQ_PATH}.`)
  }
  const requirements = readFileSync(REQ_PATH, 'utf8')

  const argv = process.argv.slice(3)
  const flag = (name) => {
    const i = argv.indexOf(name)
    return i === -1 ? null : argv[i + 1]
  }
  const limit = parseInt(flag('--limit') ?? '100', 10)
  const regenAll = argv.includes('--all')
  const onlyName = flag('--name')

  // Pick candidates: skip plate components (they don't need detailed recipes).
  // Default: enrich only rows where ingredients is empty OR method is null.
  // --all re-enriches everything (including rows that already have content).
  // --name "Moong dal" targets a single recipe.
  let q = db.from('recipes').select('id, name, description, cuisine').eq('is_plate_component', false)
  if (onlyName) q = q.ilike('name', onlyName)
  const { data: candidates, error: qErr } = await q.order('name')
  if (qErr) throw qErr

  const toEnrich = []
  for (const r of candidates ?? []) {
    if (regenAll || onlyName) { toEnrich.push(r); continue }
    const { data: existing } = await db
      .from('recipes')
      .select('ingredients, method')
      .eq('id', r.id)
      .single()
    const ingEmpty = !Array.isArray(existing?.ingredients) || existing.ingredients.length === 0
    const methodEmpty = !existing?.method || existing.method.trim() === ''
    if (ingEmpty || methodEmpty) toEnrich.push(r)
  }

  const slice = toEnrich.slice(0, limit)
  console.log(`Enriching ${slice.length} of ${toEnrich.length} candidates (${candidates?.length ?? 0} eligible, ${regenAll ? 'regen all' : 'empty-only'})`)

  const system = [
    'You are turning a short recipe name + description into a complete household recipe for the owner, using her private requirements as the source of truth for food rules.',
    'Honor every rule in the requirements. Sesame-free is mandatory. Hand portions / cups / spoons only — never grams or ounces. Keep instructions brief and practical for the owner (she cooks).',
    'If an original chef or regional attribution is reasonably well-known for the dish, name them in source_chef. Do NOT invent URLs.',
    'adaptations should describe lasting household tweaks (not weekly fridge contents), e.g. "Uses the prepared tomato base instead of fresh tomatoes and ginger." If no meaningful adaptation applies, leave as null.',
    'OUTPUT: JSON only. No prose, no markdown fences.',
    '',
    '--- OWNER REQUIREMENTS ---',
    requirements,
    '--- END REQUIREMENTS ---',
  ].join('\n')

  let done = 0
  let failed = 0
  for (const r of slice) {
    try {
      const user = [
        `Recipe name: ${r.name}`,
        `Cuisine: ${r.cuisine ?? 'any'}`,
        `Description: ${r.description ?? '(none)'}`,
        '',
        'Return JSON with this shape:',
        '{',
        '  "ingredients": ["1 cup dry yellow moong dal", "..."],',
        '  "method": "Step 1\\nStep 2\\nStep 3",',
        '  "source_chef": "Nisha Madhulika",   // or null',
        '  "adaptations": "Uses the prepared tomato base instead of fresh tomatoes and ginger.",  // or null',
        '  "sesame_safe": true',
        '}',
        '',
        'Rules:',
        '- Ingredients: one per line entry in the array, written as "quantity unit ingredient" using household measures.',
        '- Method: numbered-free, one step per line separated by \\n. 3-6 steps typical.',
        '- Keep each step short enough to read on one line.',
      ].join('\n')
      const raw = await ask(user, { system, max_tokens: 2500 })
      const parsed = parseJson(raw)
      if (!parsed) throw new Error(`Could not parse JSON. Raw: ${raw.slice(0, 200)}`)

      const patch = {
        ingredients: Array.isArray(parsed.ingredients) ? parsed.ingredients.map(String) : [],
        method: typeof parsed.method === 'string' ? parsed.method : null,
        source_chef: typeof parsed.source_chef === 'string' && parsed.source_chef.trim() ? parsed.source_chef.trim() : null,
        adaptations: typeof parsed.adaptations === 'string' && parsed.adaptations.trim() ? parsed.adaptations.trim() : null,
        sesame_safe: parsed.sesame_safe !== false,
      }
      const { error: upErr } = await db.from('recipes').update(patch).eq('id', r.id)
      if (upErr) throw upErr
      console.log(`  ✓ ${r.name} — ${patch.ingredients.length} ingredients, ${patch.method?.split('\n').length ?? 0} steps${patch.source_chef ? `, source: ${patch.source_chef}` : ''}`)
      done++
    } catch (e) {
      console.error(`  ✗ ${r.name}:`, e.message ?? e)
      failed++
    }
  }

  return { done, failed, skipped: toEnrich.length - slice.length }
}

function parseJson(raw) {
  const trimmed = raw.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
  try { return JSON.parse(trimmed) } catch { /* fall through */ }
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start >= 0 && end > start) {
    try { return JSON.parse(trimmed.slice(start, end + 1)) } catch { /* fall through */ }
  }
  return null
}
