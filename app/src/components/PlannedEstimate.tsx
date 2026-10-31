import type { MealPlanItem } from '../lib/data'
import { SLOT_LABEL } from '../lib/data'

type Props = {
  items: MealPlanItem[]
}

const TAG_ORDER = ['protein', 'vegetables', 'roots & starches', 'raita', 'alternatives', 'breakfast']

export default function PlannedEstimate({ items }: Props) {
  const totalDishes = items.length
  const slotsUsed = new Set(items.map((i) => i.slot)).size
  const cuisines = countBy(items, (i) => i.recipe?.cuisine ?? null)
  const tags = tagCounts(items)
  const uniqueDishes = new Set(items.map((i) => i.display_name ?? i.recipe?.name ?? '')).size

  const bySlot = groupBy(items, (i) => i.slot)

  return (
    <aside className="sticky top-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="eyebrow mb-2">Planned estimate</div>
      <h3 className="font-display text-2xl text-ink">What this day adds up to.</h3>
      <p className="mt-1 text-xs text-muted-soft">
        No calorie math — rough composition from recipe tags.
      </p>

      <div className="mt-5 grid grid-cols-3 gap-3 text-center">
        <Stat label="dishes" value={totalDishes} />
        <Stat label="unique" value={uniqueDishes} />
        <Stat label="meals" value={slotsUsed} />
      </div>

      <div className="mt-5">
        <div className="meta mb-2 text-muted">Composition</div>
        {tags.length === 0 ? (
          <p className="text-sm italic text-muted-soft">Nothing planned yet.</p>
        ) : (
          <ul className="space-y-2">
            {tags.map(([tag, count]) => (
              <li key={tag} className="flex items-center justify-between text-sm">
                <span className="text-ink/80">{tag}</span>
                <span className="rounded-full bg-sage px-2 py-0.5 text-xs font-medium text-ink/80">
                  {count}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {cuisines.length > 0 && (
        <div className="mt-5">
          <div className="meta mb-2 text-muted">Cuisines</div>
          <div className="flex flex-wrap gap-1.5">
            {cuisines.map(([c, n]) => (
              <span
                key={c ?? '—'}
                className="rounded-full border border-border px-2 py-0.5 text-xs text-muted"
              >
                {c ?? 'unspecified'} · {n}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5 border-t border-border pt-4">
        <div className="meta mb-2 text-muted">By meal</div>
        <ul className="space-y-1.5 text-xs">
          {(['breakfast', 'midmorning', 'lunch', 'dinner', 'evening'] as const).map((slot) => {
            const n = (bySlot.get(slot) ?? []).length
            return (
              <li key={slot} className="flex items-center justify-between">
                <span className="text-muted">{SLOT_LABEL[slot]}</span>
                <span className={n === 0 ? 'text-muted-soft italic' : 'text-ink'}>
                  {n === 0 ? '—' : `${n} ${n === 1 ? 'dish' : 'dishes'}`}
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </aside>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-surface/60 p-3">
      <div className="font-display text-2xl text-ink">{value}</div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wider text-muted">{label}</div>
    </div>
  )
}

function tagCounts(items: MealPlanItem[]): [string, number][] {
  const map = new Map<string, number>()
  for (const it of items) {
    const tags = it.recipe?.tags ?? []
    for (const t of tags) map.set(t, (map.get(t) ?? 0) + 1)
  }
  const entries = Array.from(map.entries())
  entries.sort((a, b) => {
    const ai = TAG_ORDER.indexOf(a[0])
    const bi = TAG_ORDER.indexOf(b[0])
    const aw = ai === -1 ? 999 : ai
    const bw = bi === -1 ? 999 : bi
    if (aw !== bw) return aw - bw
    return b[1] - a[1]
  })
  return entries
}

function countBy<T>(items: T[], key: (t: T) => string | null): [string | null, number][] {
  const map = new Map<string | null, number>()
  for (const it of items) {
    const k = key(it)
    map.set(k, (map.get(k) ?? 0) + 1)
  }
  return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
}

function groupBy<T, K>(items: T[], key: (t: T) => K): Map<K, T[]> {
  const m = new Map<K, T[]>()
  for (const it of items) {
    const k = key(it)
    if (!m.has(k)) m.set(k, [])
    m.get(k)!.push(it)
  }
  return m
}
