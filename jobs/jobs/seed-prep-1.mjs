import { db } from '../db.mjs'

const WEEK_START = '2026-10-26'

const SESSIONS = [
  {
    session_number: 1,
    day_hint: 'Sunday prep',
    notes: 'Big weekend prep for Mon–Wed. Target 2–2.5h.',
    items: {
      chop: [
        ['Yellow onions', '3 medium', 'small dice'],
        ['Tomatoes', '6 medium', 'chopped'],
        ['Ginger', '2 tbsp paste', 'microplaned'],
        ['Garlic', '2 tbsp paste', 'microplaned'],
        ['Carrots', '3 medium', 'thin coins'],
        ['Baby bok choy', '4 heads', 'halved lengthwise'],
        ['Cucumber', '2 small', 'batons for lunch'],
        ['Cilantro', '1 bunch', 'rough chop, in airtight tin'],
      ],
      roast: [
        ['Purple potatoes', '1½ lb', 'cubes, olive oil + salt, 425°F 25m'],
        ['Sweet potatoes', '2 medium', 'cubes, olive oil + salt, 425°F 25m'],
        ['Button mushrooms', '1 lb', 'halved, dry pan then olive oil + salt'],
      ],
      cook: [
        ['Rice (base batch)', '3 cups dry', 'rinsed; absorption, cool & refrigerate'],
        ['Moong dal', '1 cup dry', 'simmer with turmeric, portion into 3 containers'],
        ['Tomato base', '~3 cups', 'onions + ginger + garlic + tomato; freeze in cubes'],
        ['Cooked sprouts', '1 cup dry', 'boil 10m, cool, refrigerate'],
      ],
    },
  },
  {
    session_number: 2,
    day_hint: 'Wednesday refresh',
    notes: 'Midweek top-up for Thu–Sun. 45–60m.',
    items: {
      chop: [
        ['Spring onions', '4 stalks', 'green + white separated'],
        ['Green chilies', '4 small', 'thin rings'],
        ['Chinese broccoli', '1 bunch', 'cut on bias'],
        ['Green beans', '2 cups', 'topped & tailed, 1-inch pieces'],
        ['Pea-vine leaves', '2 loose cups', 'washed, spun'],
      ],
      roast: [
        ['Winter melon', '3 cups cubed', 'light roast or steam, hold for Fri dinner'],
      ],
      cook: [
        ['Rice (midweek batch)', '2 cups dry', 'fresh batch for Thu–Sat'],
        ['Soy eggs', '6 eggs', 'soft-boil 7m, cool, submerge in soy–mirin'],
        ['Ginger tofu glaze', '½ cup', 'reduce soy + mirin + ginger; store in jar'],
      ],
    },
  },
]

export default async function main() {
  const { data: week } = await db.from('weeks')
    .select('id')
    .eq('week_start', WEEK_START)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!week?.id) throw new Error('No week for ' + WEEK_START)

  const { data: existing } = await db.from('prep_sessions')
    .select('id')
    .eq('week_id', week.id)
  if (existing && existing.length) {
    const ids = existing.map((s) => s.id)
    const { error } = await db.from('prep_sessions').delete().in('id', ids)
    if (error) throw error
  }

  let sessionsCreated = 0
  let itemsCreated = 0

  for (const s of SESSIONS) {
    const { data: inserted, error } = await db.from('prep_sessions')
      .insert({
        week_id: week.id,
        session_number: s.session_number,
        day_hint: s.day_hint,
        notes: s.notes,
      })
      .select('id')
      .single()
    if (error) throw error
    sessionsCreated++

    const rows = []
    let order = 0
    for (const action of ['chop', 'roast', 'cook']) {
      for (const [ingredient_name, total_quantity, cut_style] of s.items[action] ?? []) {
        rows.push({
          session_id: inserted.id,
          ingredient_name,
          total_quantity,
          cut_style,
          action,
          order_index: order++,
          done: false,
        })
      }
    }
    if (rows.length) {
      const { error: iErr } = await db.from('prep_items').insert(rows)
      if (iErr) throw iErr
      itemsCreated += rows.length
    }
  }

  return `Seeded ${sessionsCreated} prep_sessions + ${itemsCreated} prep_items for week ${WEEK_START}.`
}
