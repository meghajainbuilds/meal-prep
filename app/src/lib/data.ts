import { supabase } from '../supabase'

export type Recipe = {
  id: string
  name: string
  description: string | null
  image_url: string | null
  tags: string[]
  cuisine: string | null
  is_favorite: boolean
  source_link: string | null
}

export type RecipeFull = Recipe & {
  source_chef: string | null
  ingredients: string[]
  method: string | null
  favorite_reason: string | null
  adaptations: string | null
  sesame_safe: boolean
}

export async function getRecipeById(id: string): Promise<RecipeFull | null> {
  const { data } = await supabase
    .from('recipes')
    .select('id, name, description, image_url, tags, cuisine, is_favorite, source_link, source_chef, ingredients, method, favorite_reason, adaptations, sesame_safe')
    .eq('id', id)
    .maybeSingle()
  if (!data) return null
  const raw = data as Record<string, unknown>
  const ing = Array.isArray(raw.ingredients)
    ? (raw.ingredients as unknown[]).map(String)
    : []
  return { ...(raw as unknown as RecipeFull), ingredients: ing }
}

export type Week = {
  id: string
  week_start: string
  version: number
  notes: string | null
}

export type MealPlanItem = {
  id: string
  week_id: string
  day_date: string
  slot: 'breakfast' | 'midmorning' | 'lunch' | 'dinner' | 'evening'
  recipe_id: string | null
  display_name: string | null
  custom_notes: string | null
  order_index: number
  recipe: Recipe | null
}

export const SLOT_LABEL: Record<MealPlanItem['slot'], string> = {
  breakfast: 'Breakfast',
  midmorning: 'Fruit + nuts',
  lunch: 'Lunch',
  dinner: 'Dinner',
  evening: 'Evening',
}

export const SLOT_TIME: Record<MealPlanItem['slot'], string> = {
  breakfast: '8:30 AM',
  midmorning: '12:00 PM',
  lunch: '2:00 PM',
  dinner: '5:30 PM',
  evening: '8:30 PM',
}

export const DAYS_IN_WEEK: MealPlanItem['slot'][] = ['breakfast', 'midmorning', 'lunch', 'dinner', 'evening']

export type AteStatus = 'as_planned' | 'substituted' | 'other' | 'skipped'

export type ActualEatingLog = {
  id: string
  day_date: string
  slot: MealPlanItem['slot'] | 'other'
  item_name: string
  status: AteStatus
  notes: string | null
}

export type SampleMenu = {
  key: string
  label: string
  byline: string
  items: { slot: MealPlanItem['slot']; recipe_name: string; custom_notes?: string }[]
}

export const SAMPLE_MENUS: SampleMenu[] = [
  {
    key: 'classic',
    label: 'Classic Megha day',
    byline: 'Dal + rice + a vegetable, miso salmon dinner.',
    items: [
      { slot: 'breakfast', recipe_name: 'Banana–berry smoothie' },
      { slot: 'breakfast', recipe_name: 'Greek yogurt' },
      { slot: 'breakfast', recipe_name: 'Daily soaked seed mix' },
      { slot: 'lunch', recipe_name: 'Moong dal' },
      { slot: 'lunch', recipe_name: 'Simple lunch vegetables' },
      { slot: 'lunch', recipe_name: 'Rice' },
      { slot: 'lunch', recipe_name: 'Whole-wheat roti' },
      { slot: 'dinner', recipe_name: 'Miso salmon' },
      { slot: 'dinner', recipe_name: 'Rice' },
      { slot: 'dinner', recipe_name: 'Greens + beans' },
    ],
  },
  {
    key: 'light',
    label: 'Light & simple',
    byline: 'Lighter breakfast, no roti, roasted yams for dinner.',
    items: [
      { slot: 'breakfast', recipe_name: 'Banana–mango smoothie' },
      { slot: 'lunch', recipe_name: 'Soy eggs' },
      { slot: 'lunch', recipe_name: 'Simple lunch vegetables' },
      { slot: 'lunch', recipe_name: 'Rice' },
      { slot: 'dinner', recipe_name: 'Bok choy + winter melon' },
      { slot: 'dinner', recipe_name: 'Roasted yams' },
    ],
  },
  {
    key: 'protein',
    label: 'Protein-forward',
    byline: 'Eggs breakfast, paneer bhurji lunch, salmon dinner.',
    items: [
      { slot: 'breakfast', recipe_name: 'Eggs, vegetables + toast' },
      { slot: 'midmorning', recipe_name: 'Greek yogurt' },
      { slot: 'lunch', recipe_name: 'Paneer bhurji' },
      { slot: 'lunch', recipe_name: 'Whole-wheat roti' },
      { slot: 'lunch', recipe_name: 'Simple lunch vegetables' },
      { slot: 'dinner', recipe_name: 'Miso salmon' },
      { slot: 'dinner', recipe_name: 'Rice' },
      { slot: 'dinner', recipe_name: 'Greens + beans' },
    ],
  },
]

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function dayShort(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  return DAY_SHORT[d.getDay()]
}
export function dayLong(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  return DAY_LONG[d.getDay()]
}
export function dayNumber(iso: string) {
  return parseInt(iso.slice(8, 10), 10)
}
export function monthShort(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleString('en-US', { month: 'short' })
}

// Returns the ISO date of the Monday on-or-before `iso`.
// JS: 0 = Sunday, 1 = Monday, ... 6 = Saturday.
export function mondayOf(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z')
  const dow = d.getUTCDay()
  const shift = dow === 0 ? -6 : 1 - dow
  d.setUTCDate(d.getUTCDate() + shift)
  return d.toISOString().slice(0, 10)
}

export function weekDates(weekStart: string): string[] {
  const start = new Date(weekStart + 'T00:00:00')
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d.toISOString().slice(0, 10)
  })
}

export type WeekWithCount = Week & { item_count: number }

// Returns every week that has at least one meal plan item, newest first.
// Picker uses this so users can jump to any historical week (and visible
// future drafts).
export async function getAllWeeksWithItems(): Promise<WeekWithCount[]> {
  const { data: weeks } = await supabase
    .from('weeks')
    .select('id, week_start, version, notes')
    .order('week_start', { ascending: false })
    .order('version', { ascending: false })
  if (!weeks || weeks.length === 0) return []
  const out: WeekWithCount[] = []
  for (const w of weeks as Week[]) {
    const { count } = await supabase
      .from('meal_plan_items')
      .select('id', { count: 'exact', head: true })
      .eq('week_id', w.id)
    if ((count ?? 0) > 0) out.push({ ...w, item_count: count ?? 0 })
  }
  return out
}

// Default-week pick: prefer the newest week whose week_start is today or
// earlier (i.e. the current or most recent past week). Fall back to the
// newest week overall only if no past-or-current week exists.
export async function getLatestWeek(): Promise<Week | null> {
  const weeks = await getAllWeeksWithItems()
  if (weeks.length === 0) return null
  const today = new Date().toISOString().slice(0, 10)
  const pastOrCurrent = weeks.find((w) => w.week_start <= today)
  return pastOrCurrent ?? weeks[0]
}

export async function getWeekByStart(weekStart: string): Promise<Week | null> {
  const { data } = await supabase
    .from('weeks')
    .select('id, week_start, version, notes')
    .eq('week_start', weekStart)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data as Week | null
}

export async function getMealPlanForWeek(weekId: string): Promise<MealPlanItem[]> {
  const { data } = await supabase
    .from('meal_plan_items')
    .select(`
      id, week_id, day_date, slot, recipe_id, display_name, custom_notes, order_index,
      recipe:recipes ( id, name, description, image_url, tags, cuisine, is_favorite, source_link )
    `)
    .eq('week_id', weekId)
    .order('day_date', { ascending: true })
    .order('slot', { ascending: true })
    .order('order_index', { ascending: true })
  return (data ?? []) as unknown as MealPlanItem[]
}

export function groupByDay(items: MealPlanItem[]): Map<string, MealPlanItem[]> {
  const map = new Map<string, MealPlanItem[]>()
  for (const item of items) {
    if (!map.has(item.day_date)) map.set(item.day_date, [])
    map.get(item.day_date)!.push(item)
  }
  return map
}

export function groupBySlot(items: MealPlanItem[]): Map<MealPlanItem['slot'], MealPlanItem[]> {
  const map = new Map<MealPlanItem['slot'], MealPlanItem[]>()
  for (const item of items) {
    if (!map.has(item.slot)) map.set(item.slot, [])
    map.get(item.slot)!.push(item)
  }
  return map
}

export async function getAllRecipes(): Promise<Recipe[]> {
  const { data } = await supabase
    .from('recipes')
    .select('id, name, description, image_url, tags, cuisine, is_favorite, source_link')
    .order('name', { ascending: true })
  return (data ?? []) as Recipe[]
}

export async function addMealPlanItem(args: {
  week_id: string
  day_date: string
  slot: MealPlanItem['slot']
  recipe_id: string | null
  display_name?: string | null
  custom_notes?: string | null
  order_index?: number
}) {
  const { error } = await supabase.from('meal_plan_items').insert({
    week_id: args.week_id,
    day_date: args.day_date,
    slot: args.slot,
    recipe_id: args.recipe_id,
    display_name: args.display_name ?? null,
    custom_notes: args.custom_notes ?? null,
    order_index: args.order_index ?? 0,
  })
  if (error) throw error
}

export async function updateMealPlanItem(id: string, patch: Partial<Pick<MealPlanItem, 'custom_notes' | 'display_name' | 'order_index'>>) {
  const { error } = await supabase.from('meal_plan_items').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteMealPlanItem(id: string) {
  const { error } = await supabase.from('meal_plan_items').delete().eq('id', id)
  if (error) throw error
}

export async function applySampleMenu(weekId: string, dayDate: string, menuKey: string) {
  const menu = SAMPLE_MENUS.find((m) => m.key === menuKey)
  if (!menu) throw new Error('Unknown menu: ' + menuKey)
  const recipes = await getAllRecipes()
  const byName = new Map(recipes.map((r) => [r.name.toLowerCase(), r]))

  const { error: delErr } = await supabase.from('meal_plan_items')
    .delete()
    .eq('week_id', weekId)
    .eq('day_date', dayDate)
  if (delErr) throw delErr

  const rows: Record<string, unknown>[] = []
  const bySlot = new Map<string, number>()
  for (const it of menu.items) {
    const r = byName.get(it.recipe_name.toLowerCase())
    const order = bySlot.get(it.slot) ?? 0
    bySlot.set(it.slot, order + 1)
    rows.push({
      week_id: weekId,
      day_date: dayDate,
      slot: it.slot,
      recipe_id: r?.id ?? null,
      display_name: r ? null : it.recipe_name,
      custom_notes: it.custom_notes ?? null,
      order_index: order,
    })
  }
  if (rows.length) {
    const { error } = await supabase.from('meal_plan_items').insert(rows)
    if (error) throw error
  }
}

export async function getActualEatingForDate(dayDate: string): Promise<ActualEatingLog[]> {
  const { data } = await supabase
    .from('actual_eating_log')
    .select('id, day_date, slot, item_name, status, notes')
    .eq('day_date', dayDate)
  return (data ?? []) as ActualEatingLog[]
}

export async function upsertSlotAteLog(args: {
  day_date: string
  slot: MealPlanItem['slot']
  status: AteStatus
  notes?: string | null
  item_name?: string
}) {
  const itemName = args.item_name ?? '__slot__'
  const { data: existing } = await supabase
    .from('actual_eating_log')
    .select('id')
    .eq('day_date', args.day_date)
    .eq('slot', args.slot)
    .eq('item_name', itemName)
    .maybeSingle()

  if (existing?.id) {
    const { error } = await supabase.from('actual_eating_log')
      .update({ status: args.status, notes: args.notes ?? null })
      .eq('id', existing.id)
    if (error) throw error
    return existing.id as string
  }
  const { data: inserted, error } = await supabase.from('actual_eating_log')
    .insert({
      day_date: args.day_date,
      slot: args.slot,
      item_name: itemName,
      status: args.status,
      notes: args.notes ?? null,
    })
    .select('id')
    .single()
  if (error) throw error
  return inserted!.id as string
}

export type PrepAction = 'chop' | 'roast' | 'cook'

export type PrepItem = {
  id: string
  session_id: string
  ingredient_name: string
  total_quantity: string | null
  cut_style: string | null
  action: PrepAction
  image_url: string | null
  order_index: number
  done: boolean
}

export type PrepSession = {
  id: string
  week_id: string
  session_number: 1 | 2
  day_hint: string | null
  notes: string | null
  items: PrepItem[]
}

export const PREP_ACTIONS: { key: PrepAction; label: string }[] = [
  { key: 'chop', label: 'Chop' },
  { key: 'roast', label: 'Roast' },
  { key: 'cook', label: 'Cook' },
]

export async function getPrepSessionsForWeek(weekId: string): Promise<PrepSession[]> {
  const { data: sessions } = await supabase
    .from('prep_sessions')
    .select('id, week_id, session_number, day_hint, notes')
    .eq('week_id', weekId)
    .order('session_number', { ascending: true })
  if (!sessions || sessions.length === 0) return []

  const ids = sessions.map((s) => s.id)
  const { data: items } = await supabase
    .from('prep_items')
    .select('id, session_id, ingredient_name, total_quantity, cut_style, action, image_url, order_index, done')
    .in('session_id', ids)
    .order('order_index', { ascending: true })

  const bySession = new Map<string, PrepItem[]>()
  for (const row of (items ?? []) as PrepItem[]) {
    if (!bySession.has(row.session_id)) bySession.set(row.session_id, [])
    bySession.get(row.session_id)!.push(row)
  }
  return (sessions as Omit<PrepSession, 'items'>[]).map((s) => ({
    ...s,
    items: bySession.get(s.id) ?? [],
  }))
}

export async function updatePrepItem(id: string, patch: Partial<Pick<PrepItem, 'done' | 'ingredient_name' | 'total_quantity' | 'cut_style' | 'session_id' | 'action'>>) {
  const { error } = await supabase.from('prep_items').update(patch).eq('id', id)
  if (error) throw error
}

export async function deletePrepItem(id: string) {
  const { error } = await supabase.from('prep_items').delete().eq('id', id)
  if (error) throw error
}

export async function addPrepItem(args: {
  session_id: string
  action: PrepAction
  ingredient_name: string
  total_quantity?: string | null
  cut_style?: string | null
  order_index?: number
}) {
  const { error } = await supabase.from('prep_items').insert({
    session_id: args.session_id,
    action: args.action,
    ingredient_name: args.ingredient_name,
    total_quantity: args.total_quantity ?? null,
    cut_style: args.cut_style ?? null,
    order_index: args.order_index ?? 0,
    done: false,
  })
  if (error) throw error
}

export async function updatePrepSessionNotes(id: string, notes: string) {
  const { error } = await supabase.from('prep_sessions').update({ notes }).eq('id', id)
  if (error) throw error
}

export type ShoppingItem = {
  id: string
  week_id: string
  name: string
  category: string | null
  quantity: string | null
  unit: string | null
  have: boolean
  image_url: string | null
  used_in_recipes: { id: string; name: string; image_url: string | null }[]
  is_pantry: boolean
}

export const INGREDIENT_CATEGORIES: { key: string; label: string }[] = [
  { key: 'fresh', label: 'Fresh, chilled & frozen' },
  { key: 'pantry', label: 'Pantry' },
  { key: 'alternatives', label: 'Alternatives' },
]

export async function getShoppingItemsForWeek(weekId: string): Promise<ShoppingItem[]> {
  const { data } = await supabase
    .from('shopping_items')
    .select('id, week_id, name, category, quantity, unit, have, image_url, used_in_recipes, is_pantry')
    .eq('week_id', weekId)
    .order('name', { ascending: true })
  return (data ?? []) as ShoppingItem[]
}

export async function updateShoppingItem(id: string, patch: Partial<Pick<ShoppingItem, 'have' | 'quantity'>>) {
  const { error } = await supabase.from('shopping_items').update(patch).eq('id', id)
  if (error) throw error
}

export async function clearSlotAteLog(dayDate: string, slot: MealPlanItem['slot']) {
  const { error } = await supabase.from('actual_eating_log')
    .delete()
    .eq('day_date', dayDate)
    .eq('slot', slot)
    .eq('item_name', '__slot__')
  if (error) throw error
}
