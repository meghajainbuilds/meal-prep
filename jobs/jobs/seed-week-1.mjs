import { db } from '../db.mjs'

const RECIPES = [
  { name: 'Moong dal', description: 'Yellow moong dal with tomato, cumin and turmeric.', tags: ['protein'], cuisine: 'indian' },
  { name: 'Cooked sprouts', description: 'A small, fully cooked legume side.', tags: ['protein'], cuisine: 'indian' },
  { name: 'Ginger tofu', description: 'Golden tofu with a ginger–soy glaze.', tags: ['protein'], cuisine: 'japanese' },
  { name: 'Soy eggs', description: 'Eggs in a lightly sweet soy marinade.', tags: ['protein'], cuisine: 'japanese' },
  { name: 'Paneer bhurji', description: 'Indian paneer scramble with tomato.', tags: ['protein'], cuisine: 'indian' },
  { name: 'Miso salmon', description: 'Miso-glazed salmon, dinner only.', tags: ['protein', 'fish'], cuisine: 'japanese' },
  { name: 'Bok choy + winter melon', description: 'Asian greens with winter melon and carrot.', tags: ['vegetables'], cuisine: 'asian' },
  { name: 'Greens + beans', description: 'Chinese broccoli, green beans, pea-vine leaves with peas.', tags: ['vegetables'], cuisine: 'asian' },
  { name: 'Simple lunch vegetables', description: 'Cucumber, carrot sticks, blanched sides.', tags: ['vegetables'], cuisine: 'any' },
  { name: 'Lauki raita', description: 'Bottle gourd yogurt side.', tags: ['raita'], cuisine: 'indian' },
  { name: 'Purple potatoes', description: 'Simple roasted purple potatoes.', tags: ['roots & starches'], cuisine: 'any' },
  { name: 'Roasted yams', description: 'Tender, lightly browned sweet-potato cubes.', tags: ['roots & starches'], cuisine: 'any' },
  { name: 'Rice', description: 'Plain cooked rice.', tags: ['roots & starches'], cuisine: 'any' },
  { name: 'Whole-wheat roti', description: 'Store-bought whole wheat flatbread.', tags: ['roots & starches'], cuisine: 'indian' },
  { name: 'Pan-cooked mushrooms', description: 'A mushroom side to serve separately.', tags: ['alternatives'], cuisine: 'any' },
  { name: 'Tomato base', description: 'A tomato, ginger and garlic base to portion and freeze.', tags: ['prep bases'], cuisine: 'indian' },
  { name: 'Banana–mango smoothie', description: 'Banana and mango with yogurt and oat milk.', tags: ['breakfast'], cuisine: 'any' },
  { name: 'Banana–berry smoothie', description: 'Banana and mixed berries with yogurt and oat milk.', tags: ['breakfast'], cuisine: 'any' },
  { name: 'Eggs, vegetables + toast', description: 'Breakfast scramble with vegetables and Hero toast.', tags: ['breakfast'], cuisine: 'any' },
  { name: 'Greek yogurt', description: 'Plain full-fat Greek yogurt breakfast side.', tags: ['breakfast'], cuisine: 'any' },
  { name: 'Daily soaked seed mix', description: '1 tbsp total chia / hemp / flax soaked overnight.', tags: ['breakfast'], cuisine: 'any' },
]

const WEEK_START = '2026-10-26'

const DAY_PLAN = {
  '2026-10-26': {
    breakfast: ['Banana–mango smoothie', 'Daily soaked seed mix'],
    lunch: ['Moong dal', 'Simple lunch vegetables', 'Rice'],
    dinner: ['Paneer bhurji', 'Bok choy + winter melon', 'Rice'],
  },
  '2026-10-27': {
    breakfast: ['Eggs, vegetables + toast', 'Greek yogurt', 'Daily soaked seed mix'],
    lunch: ['Cooked sprouts', 'Simple lunch vegetables', 'Rice'],
    dinner: ['Ginger tofu', 'Greens + beans', 'Rice'],
  },
  '2026-10-28': {
    breakfast: ['Banana–berry smoothie', 'Daily soaked seed mix'],
    lunch: ['Moong dal', 'Whole-wheat roti', 'Lauki raita'],
    dinner: ['Paneer bhurji', 'Bok choy + winter melon', 'Purple potatoes'],
  },
  '2026-10-29': {
    breakfast: ['Banana–mango smoothie', 'Daily soaked seed mix'],
    lunch: ['Paneer bhurji', 'Simple lunch vegetables', 'Whole-wheat roti'],
    dinner: ['Miso salmon', 'Bok choy + winter melon', 'Rice'],
  },
  '2026-10-30': {
    breakfast: ['Eggs, vegetables + toast', 'Greek yogurt', 'Daily soaked seed mix'],
    lunch: ['Cooked sprouts', 'Soy eggs', 'Simple lunch vegetables', 'Rice'],
    dinner: ['Paneer bhurji', 'Bok choy + winter melon', 'Rice'],
  },
  '2026-10-31': {
    breakfast: ['Banana–berry smoothie', 'Daily soaked seed mix'],
    lunch: ['Paneer bhurji', 'Bok choy + winter melon', 'Rice'],
    dinner: ['Cooked sprouts', 'Soy eggs', 'Bok choy + winter melon', 'Simple lunch vegetables', 'Rice'],
  },
  '2026-11-01': {
    breakfast: ['Eggs, vegetables + toast', 'Greek yogurt', 'Daily soaked seed mix'],
    lunch: ['Cooked sprouts', 'Soy eggs', 'Simple lunch vegetables', 'Rice'],
    dinner: ['Paneer bhurji', 'Bok choy + winter melon', 'Rice'],
  },
}

export default async function seedWeek1() {
  const recipeIds = new Map()
  let recipesCreated = 0
  let recipesSkipped = 0

  for (const r of RECIPES) {
    const { data: existing } = await db
      .from('recipes')
      .select('id')
      .eq('name', r.name)
      .maybeSingle()
    if (existing) {
      recipeIds.set(r.name, existing.id)
      recipesSkipped++
    } else {
      const { data, error } = await db.from('recipes').insert(r).select('id').single()
      if (error) throw error
      recipeIds.set(r.name, data.id)
      recipesCreated++
    }
  }

  let { data: week } = await db
    .from('weeks')
    .select('id, week_start, version')
    .eq('week_start', WEEK_START)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!week) {
    const ins = await db
      .from('weeks')
      .insert({ week_start: WEEK_START, version: 1, notes: 'Week 1 sample · Indian + Japanese' })
      .select('id, week_start, version')
      .single()
    if (ins.error) throw ins.error
    week = ins.data
  } else {
    await db.from('weeks').update({ notes: 'Week 1 sample · Indian + Japanese' }).eq('id', week.id)
  }

  const { error: delErr } = await db.from('meal_plan_items').delete().eq('week_id', week.id)
  if (delErr) throw delErr

  const rows = []
  for (const [date, slots] of Object.entries(DAY_PLAN)) {
    for (const [slot, names] of Object.entries(slots)) {
      names.forEach((name, i) => {
        const recipe_id = recipeIds.get(name)
        if (!recipe_id) throw new Error(`Missing recipe for ${name}`)
        rows.push({
          week_id: week.id,
          day_date: date,
          slot,
          recipe_id,
          display_name: name,
          order_index: i,
        })
      })
    }
  }

  const { error: insErr } = await db.from('meal_plan_items').insert(rows)
  if (insErr) throw insErr

  return {
    week: `${week.week_start} v${week.version}`,
    recipes: `created ${recipesCreated}, kept ${recipesSkipped}`,
    meal_plan_items_inserted: rows.length,
  }
}
