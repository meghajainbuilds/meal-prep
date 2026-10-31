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

export function weekDates(weekStart: string): string[] {
  const start = new Date(weekStart + 'T00:00:00')
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d.toISOString().slice(0, 10)
  })
}

export async function getLatestWeek(): Promise<Week | null> {
  const { data } = await supabase
    .from('weeks')
    .select('id, week_start, version, notes')
    .order('week_start', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data as Week | null
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
