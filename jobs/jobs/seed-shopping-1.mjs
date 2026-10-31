import { db } from '../db.mjs'

const WEEK_START = '2026-10-26'

const FRESH = [
  ['Bottle gourd', '1½ cups grated', ['Lauki raita']],
  ['Winter melon', '3 cups cubed', ['Bok choy + winter melon']],
  ['Chinese broccoli', '1 bunch, about 4 loose cups', ['Greens + beans']],
  ['Pea-vine leaves', '1 small bunch, about 2 loose cups', ['Greens + beans']],
  ['Baby bok choy', '6 baby heads, about 4 loose cups', ['Bok choy + winter melon']],
  ['Green beans', '2 cups chopped', ['Greens + beans']],
  ['Carrots', '4 medium total', ['Greens + beans', 'Bok choy + winter melon', 'Simple lunch vegetables']],
  ['Spring onions', '4 stalks total', ['Ginger tofu', 'Bok choy + winter melon']],
  ['Cucumber', '2 small', ['Simple lunch vegetables']],
  ['Tomatoes', '6 medium', ['Moong dal', 'Paneer bhurji', 'Tomato base']],
  ['Yellow onions', '3 medium', ['Moong dal', 'Paneer bhurji']],
  ['Fresh ginger', '1 large hand', ['Moong dal', 'Paneer bhurji', 'Ginger tofu', 'Tomato base']],
  ['Garlic', '2 heads', ['Greens + beans', 'Tomato base']],
  ['Cilantro', '1 bunch', ['Moong dal', 'Paneer bhurji']],
  ['Green chilies', '4 small', ['Moong dal', 'Paneer bhurji']],
  ['Lemons', '3', ['Moong dal', 'Simple lunch vegetables']],
  ['Button mushrooms', '1 lb', ['Pan-cooked mushrooms']],
  ['Purple potatoes', '1½ lb', ['Purple potatoes']],
  ['Sweet potatoes (yams)', '2 medium', ['Roasted yams']],
  ['Mango', '1 ripe (or 1 cup frozen)', ['Banana–mango smoothie']],
  ['Bananas', '7 ripe', ['Banana–mango smoothie', 'Banana–berry smoothie']],
  ['Mixed berries (frozen)', '2 cups', ['Banana–berry smoothie']],
  ['Green peas (frozen)', '1 cup', ['Greens + beans']],
  ['Firm tofu', '1 block (14 oz)', ['Ginger tofu']],
  ['Paneer', '1 lb', ['Paneer bhurji']],
  ['Eggs', '1 dozen', ['Soy eggs', 'Eggs, vegetables + toast']],
  ['Salmon fillet', '12 oz, skin on', ['Miso salmon']],
  ['Greek yogurt (full-fat)', '1 qt', ['Greek yogurt', 'Lauki raita', 'Banana–mango smoothie', 'Banana–berry smoothie']],
  ['Oat milk', '1 half-gallon', ['Banana–mango smoothie', 'Banana–berry smoothie']],
  ['Whole-wheat roti (frozen or fresh)', '12 count', ['Whole-wheat roti']],
]

const PANTRY = [
  ['Moong dal (split yellow)', '1 cup dry', ['Moong dal']],
  ['Mixed sprouts (dried)', '1 cup dry', ['Cooked sprouts']],
  ['Basmati rice', '3 cups dry', ['Rice']],
  ['White miso', '¼ cup', ['Miso salmon']],
  ['Mirin', '¼ cup', ['Miso salmon', 'Ginger tofu', 'Soy eggs']],
  ['Low-sodium soy sauce', '½ cup', ['Ginger tofu', 'Soy eggs']],
  ['Sake (cooking)', '2 tbsp', ['Miso salmon']],
  ['Olive oil', 'pantry', ['Purple potatoes', 'Roasted yams']],
  ['Neutral cooking oil', 'pantry', ['Moong dal', 'Paneer bhurji', 'Ginger tofu', 'Pan-cooked mushrooms']],
  ['Chia seeds', '2 tbsp per week', ['Daily soaked seed mix']],
  ['Hemp seeds', '2 tbsp per week', ['Daily soaked seed mix']],
  ['Flax seeds (ground)', '2 tbsp per week', ['Daily soaked seed mix']],
  ['Cumin seeds', 'pantry', ['Moong dal', 'Cooked sprouts', 'Lauki raita']],
  ['Ground turmeric', 'pantry', ['Moong dal', 'Paneer bhurji']],
  ['Kosher salt', 'pantry', []],
  ['Sugar', 'pantry', ['Soy eggs']],
  ['Hero sourdough / toast bread', '1 loaf', ['Eggs, vegetables + toast']],
  ['Black pepper', 'pantry', []],
]

const ALTERNATIVES = [
  ['Pan-cooked mushrooms (prep)', 'see Prep', ['Pan-cooked mushrooms']],
  ['Soy milk', '1 qt', ['Banana–mango smoothie', 'Banana–berry smoothie']],
  ['JUST Egg or flax egg', '1 bottle / 2 tbsp flax', ['Eggs, vegetables + toast']],
  ['Brown basmati rice', '2 cups dry', ['Rice']],
  ['Gluten-free flatbread', '6 count', ['Whole-wheat roti']],
  ['Plant-based yogurt (coconut)', '1 pt', ['Greek yogurt', 'Lauki raita']],
  ['Maple syrup', '¼ cup', ['Soy eggs']],
  ['Extra-firm tofu (paneer sub)', '1 block', ['Paneer bhurji']],
]

const HAVE_DEFAULT = new Set([
  'Olive oil', 'Neutral cooking oil', 'Kosher salt', 'Black pepper', 'Sugar',
  'Chia seeds', 'Hemp seeds', 'Flax seeds (ground)', 'Cumin seeds', 'Ground turmeric',
  'Basmati rice', 'Low-sodium soy sauce', 'Mirin', 'White miso', 'Sake (cooking)',
  'Greek yogurt (full-fat)', 'Oat milk', 'Eggs', 'Garlic',
])

export default async function main() {
  const { data: week } = await db.from('weeks')
    .select('id')
    .eq('week_start', WEEK_START)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!week?.id) throw new Error('No week found for ' + WEEK_START)

  const { data: recipes } = await db.from('recipes').select('id, name, image_url')
  const byName = new Map((recipes ?? []).map((r) => [r.name.toLowerCase(), r]))

  const { error: delErr } = await db.from('shopping_items').delete().eq('week_id', week.id)
  if (delErr) throw delErr

  const rows = []
  function push(category, isPantry, entries) {
    for (const [name, quantity, usedNames] of entries) {
      const used = usedNames
        .map((n) => byName.get(n.toLowerCase()))
        .filter(Boolean)
        .map((r) => ({ id: r.id, name: r.name, image_url: r.image_url ?? null }))
      rows.push({
        week_id: week.id,
        name,
        category,
        quantity,
        unit: null,
        have: HAVE_DEFAULT.has(name),
        image_url: null,
        used_in_recipes: used,
        is_pantry: isPantry,
      })
    }
  }
  push('fresh', false, FRESH)
  push('pantry', true, PANTRY)
  push('alternatives', false, ALTERNATIVES)

  const { error } = await db.from('shopping_items').insert(rows)
  if (error) throw error

  const have = rows.filter((r) => r.have).length
  return `${rows.length} shopping_items (${FRESH.length} fresh + ${PANTRY.length} pantry + ${ALTERNATIVES.length} alternatives). ${have} marked Have.`
}
