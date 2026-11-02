import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import Anthropic from '@anthropic-ai/sdk'
import { db } from '../db.mjs'
import { env } from '../env.mjs'

const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })

const here = dirname(fileURLToPath(import.meta.url))
const REQ_PATH = resolve(here, '..', '..', '.claude', 'requirements.md')

const CATEGORIES = ['fresh', 'pantry', 'alternatives']
const ACTIONS = ['chop', 'roast', 'cook']

// Pantry basics that are almost always "already have" so the shopping screen
// doesn't nag about them every week.
const DEFAULT_HAVE = new Set([
  'olive oil', 'neutral cooking oil', 'kosher salt', 'black pepper', 'sugar',
  'chia seeds', 'hemp seeds', 'flax seeds (ground)', 'cumin seeds', 'ground turmeric',
  'basmati rice', 'low-sodium soy sauce', 'mirin', 'white miso', 'sake (cooking)',
  'greek yogurt (full-fat)', 'oat milk', 'eggs', 'garlic',
])

export default async function fillShoppingPrep(opts = {}) {
  const weekId = opts.weekId ?? process.env.WEEK_ID ?? null
  const week = weekId
    ? await loadWeekById(weekId)
    : await pickWeekNeedingFill()

  if (!week) return 'No week needs shopping/prep fill.'

  const [menu, recipes, priorShopping, priorPrep] = await Promise.all([
    loadMenuForWeek(week.id),
    loadRecipeCatalog(),
    loadPriorShopping(),
    loadPriorPrep(),
  ])

  if (menu.length === 0) {
    return `Week ${week.week_start} v${week.version} has no meal_plan_items; nothing to shop or prep for.`
  }

  const requirements = existsSync(REQ_PATH) ? readFileSync(REQ_PATH, 'utf8') : null

  const payload = await askClaude({ week, menu, recipes, requirements })
  if (!payload?.shopping || !payload?.prep) {
    throw new Error('Claude response missing shopping/prep sections.')
  }

  await replaceShopping({ week, parsed: payload.shopping, recipes, priorShopping })
  const prepStats = await replacePrep({ week, parsed: payload.prep, priorPrep })

  const shopCount = countShopping(payload.shopping)
  return `Week ${week.week_start} v${week.version}: filled ${shopCount} shopping_items + ${prepStats.sessions} prep_sessions / ${prepStats.items} prep_items.`
}

async function loadWeekById(id) {
  const { data } = await db
    .from('weeks')
    .select('id, week_start, version')
    .eq('id', id)
    .maybeSingle()
  return data ?? null
}

async function pickWeekNeedingFill() {
  const { data: weeks } = await db
    .from('weeks')
    .select('id, week_start, version')
    .order('week_start', { ascending: false })
    .order('version', { ascending: false })
  for (const w of weeks ?? []) {
    const [{ count: planCount }, { count: shopCount }, { count: prepSess }] = await Promise.all([
      db.from('meal_plan_items').select('id', { count: 'exact', head: true }).eq('week_id', w.id),
      db.from('shopping_items').select('id', { count: 'exact', head: true }).eq('week_id', w.id),
      db.from('prep_sessions').select('id', { count: 'exact', head: true }).eq('week_id', w.id),
    ])
    if ((planCount ?? 0) > 0 && ((shopCount ?? 0) === 0 || (prepSess ?? 0) === 0)) {
      return w
    }
  }
  return null
}

async function loadMenuForWeek(weekId) {
  const { data } = await db
    .from('meal_plan_items')
    .select('day_date, slot, display_name, recipe:recipes(name, ingredients, is_plate_component)')
    .eq('week_id', weekId)
    .order('day_date', { ascending: true })
    .order('slot', { ascending: true })
    .order('order_index', { ascending: true })
  return data ?? []
}

async function loadRecipeCatalog() {
  const { data } = await db
    .from('recipes')
    .select('id, name, image_url, ingredients, is_plate_component')
    .order('name', { ascending: true })
  return data ?? []
}

async function loadPriorShopping() {
  const { data } = await db
    .from('shopping_items')
    .select('name, category, is_pantry, image_url')
  const byName = new Map()
  for (const r of data ?? []) {
    const key = r.name.toLowerCase()
    const existing = byName.get(key)
    if (!existing || (!existing.image_url && r.image_url)) byName.set(key, r)
  }
  return byName
}

async function loadPriorPrep() {
  const { data } = await db
    .from('prep_items')
    .select('ingredient_name, action, cut_style, image_url')
  const byKey = new Map()
  for (const r of data ?? []) {
    const key = `${r.ingredient_name.toLowerCase()}|${r.action}|${(r.cut_style ?? '').toLowerCase()}`
    const existing = byKey.get(key)
    if (!existing || (!existing.image_url && r.image_url)) byKey.set(key, r)
  }
  return byKey
}

async function askClaude({ week, menu, recipes, requirements }) {
  const menuLines = menu
    .map((m) => {
      const name = m.recipe?.name ?? m.display_name ?? '(unnamed)'
      return `  - ${m.day_date} ${m.slot}: ${name}`
    })
    .join('\n')

  const recipeLines = recipes
    .filter((r) => Array.isArray(r.ingredients) && r.ingredients.length)
    .map((r) => `  - ${r.name}${r.is_plate_component ? ' (plate component)' : ''}: ${r.ingredients.join('; ')}`)
    .join('\n')

  const system = [
    'You are generating a weekly shopping list and two prep sessions from an already-planned household menu.',
    'Honor every rule in the owner\'s requirements document. Match the menu exactly; do not add dishes.',
    'Consolidate ingredients across dishes into one line per ingredient with a total quantity for the week.',
    'Session 1 is the big Sunday prep for Mon–Wed; Session 2 is a shorter Wednesday refresh for Thu–Sun.',
    'Prep items are physical kitchen tasks (chop onions, roast potatoes, cook rice), not shopping items.',
    'Output JSON only, no prose or markdown fences.',
    requirements ? '\n--- REQUIREMENTS DOCUMENT ---' : '',
    requirements ?? '',
    requirements ? '--- END REQUIREMENTS DOCUMENT ---' : '',
  ].filter(Boolean).join('\n')

  const user = [
    `Week starting Monday ${week.week_start}. The menu is already decided:`,
    menuLines,
    '',
    'RECIPE INGREDIENT REFERENCE (use these quantities as the source of truth where available):',
    recipeLines || '(no enriched recipes available; infer standard household amounts)',
    '',
    'OUTPUT: a single JSON object with this exact shape:',
    '{',
    '  "shopping": {',
    '    "fresh":        [ { "name": "...", "quantity": "...", "used_in": ["Recipe name", ...] } ],',
    '    "pantry":       [ { "name": "...", "quantity": "...", "used_in": [...] } ],',
    '    "alternatives": [ { "name": "...", "quantity": "...", "used_in": [...] } ]',
    '  },',
    '  "prep": [',
    '    {',
    '      "session_number": 1,',
    '      "day_hint": "Sunday prep",',
    '      "notes": "Target time + what to parallelize",',
    '      "items": {',
    '        "chop":  [ { "ingredient": "...", "quantity": "...", "cut": "..." } ],',
    '        "roast": [ { "ingredient": "...", "quantity": "...", "cut": "..." } ],',
    '        "cook":  [ { "ingredient": "...", "quantity": "...", "cut": "..." } ]',
    '      }',
    '    },',
    '    { "session_number": 2, "day_hint": "Wednesday refresh", "notes": "...", "items": {...} }',
    '  ]',
    '}',
    '',
    'Rules:',
    '- Pantry = shelf-stable items (oil, rice, miso, soy, spices). Fresh = anything perishable. Alternatives = optional swaps.',
    '- Every shopping item\'s "used_in" must list at least one recipe name from the menu above.',
    '- Prep "cut" can be the preparation style (small dice, batons, cubed, halved, etc.) or null.',
    '- 6–12 items per prep session total; do not pad.',
  ].join('\n')

  const message = await anthropic.messages.create({
    model: env.AI_MODEL,
    max_tokens: 8000,
    thinking: { type: 'between_tools' },
    system,
    messages: [{ role: 'user', content: user }],
  })
  const raw = message.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
  const parsed = parseJson(raw)
  if (!parsed) {
    console.error('stop_reason:', message.stop_reason, 'usage:', JSON.stringify(message.usage))
    console.error('Raw Claude response (first 1500 chars):\n' + raw.slice(0, 1500))
    console.error('Raw Claude response (last 500 chars):\n' + raw.slice(-500))
  }
  return parsed
}

async function replaceShopping({ week, parsed, recipes, priorShopping }) {
  const recipesByLowerName = new Map(recipes.map((r) => [r.name.toLowerCase(), r]))

  await db.from('shopping_items').delete().eq('week_id', week.id)

  const rows = []
  const seen = new Set()
  for (const category of CATEGORIES) {
    const list = Array.isArray(parsed[category]) ? parsed[category] : []
    for (const entry of list) {
      const name = String(entry?.name ?? '').trim()
      if (!name) continue
      const dedupeKey = `${category}|${name.toLowerCase()}`
      if (seen.has(dedupeKey)) continue
      seen.add(dedupeKey)

      const quantity = typeof entry.quantity === 'string' && entry.quantity.trim() ? entry.quantity.trim() : null
      const usedNames = Array.isArray(entry.used_in) ? entry.used_in : []
      const usedIn = usedNames
        .map((n) => recipesByLowerName.get(String(n).toLowerCase()))
        .filter(Boolean)
        .map((r) => ({ id: r.id, name: r.name, image_url: r.image_url ?? null }))

      const prior = priorShopping.get(name.toLowerCase())
      rows.push({
        week_id: week.id,
        name,
        category,
        quantity,
        unit: null,
        have: DEFAULT_HAVE.has(name.toLowerCase()),
        image_url: prior?.image_url ?? null,
        used_in_recipes: usedIn,
        is_pantry: category === 'pantry',
      })
    }
  }

  if (rows.length === 0) return
  const { error } = await db.from('shopping_items').insert(rows)
  if (error) throw error
}

async function replacePrep({ week, parsed, priorPrep }) {
  const { data: existing } = await db.from('prep_sessions').select('id').eq('week_id', week.id)
  if (existing?.length) {
    const { error } = await db.from('prep_sessions').delete().in('id', existing.map((s) => s.id))
    if (error) throw error
  }

  let sessionCount = 0
  let itemCount = 0

  for (const s of Array.isArray(parsed) ? parsed : []) {
    const sessionNumber = s.session_number === 2 ? 2 : 1
    const { data: inserted, error: sessErr } = await db
      .from('prep_sessions')
      .insert({
        week_id: week.id,
        session_number: sessionNumber,
        day_hint: typeof s.day_hint === 'string' ? s.day_hint : null,
        notes: typeof s.notes === 'string' ? s.notes : null,
      })
      .select('id')
      .single()
    if (sessErr) throw sessErr
    sessionCount++

    const rows = []
    let order = 0
    for (const action of ACTIONS) {
      const list = Array.isArray(s.items?.[action]) ? s.items[action] : []
      for (const it of list) {
        const ingredient = String(it?.ingredient ?? '').trim()
        if (!ingredient) continue
        const quantity = typeof it.quantity === 'string' && it.quantity.trim() ? it.quantity.trim() : null
        const cut = typeof it.cut === 'string' && it.cut.trim() ? it.cut.trim() : null
        const key = `${ingredient.toLowerCase()}|${action}|${(cut ?? '').toLowerCase()}`
        const prior = priorPrep.get(key)
        rows.push({
          session_id: inserted.id,
          ingredient_name: ingredient,
          total_quantity: quantity,
          cut_style: cut,
          action,
          image_url: prior?.image_url ?? null,
          order_index: order++,
          done: false,
        })
      }
    }

    if (rows.length) {
      const { error: itemsErr } = await db.from('prep_items').insert(rows)
      if (itemsErr) throw itemsErr
      itemCount += rows.length
    }
  }

  return { sessions: sessionCount, items: itemCount }
}

function countShopping(parsed) {
  let n = 0
  for (const cat of CATEGORIES) {
    if (Array.isArray(parsed[cat])) n += parsed[cat].length
  }
  return n
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
