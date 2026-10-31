import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import type { AppContext } from '../App'
import DishChip from '../components/DishChip'
import SignIn from '../components/SignIn'
import {
  dayLong, dayShort, dayNumber,
  getMealPlanForWeek, groupByDay, groupBySlot,
  weekDates,
  type MealPlanItem,
} from '../lib/data'

const COLS: { slot: MealPlanItem['slot']; label: string }[] = [
  { slot: 'breakfast', label: 'Breakfast' },
  { slot: 'lunch', label: 'Lunch' },
  { slot: 'dinner', label: 'Dinner' },
]

export default function Week() {
  const { session, activeWeek } = useOutletContext<AppContext>()
  const [items, setItems] = useState<MealPlanItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activeWeek) { setLoading(false); return }
    getMealPlanForWeek(activeWeek.id).then((d) => { setItems(d); setLoading(false) })
  }, [activeWeek?.id])

  if (!activeWeek) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <h2 className="mb-2 text-2xl font-medium text-ink">No week yet.</h2>
        <p className="mb-6 text-muted">Sign in and let the Friday schedule create the first draft, or add one by hand.</p>
        {!session && <SignIn />}
      </div>
    )
  }

  const byDay = groupByDay(items)
  const dates = weekDates(activeWeek.week_start)

  return (
    <div className="space-y-10">
      <section>
        <div className="eyebrow mb-3">This week</div>
        <h2 className="text-4xl font-normal text-ink">Week view.</h2>
        <p className="mt-2 text-sm text-muted">
          {dayLong(dates[0])} to {dayLong(dates[6])}. Click a day to open it.
        </p>
      </section>

      {loading ? (
        <p className="text-muted">Loading plan…</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {dates.map((date, idx) => {
            const daySlots = groupBySlot(byDay.get(date) ?? [])
            return (
              <div
                key={date}
                className={
                  'grid grid-cols-[7rem_1fr_1fr_1fr_2rem] gap-4 border-b border-border p-6 last:border-b-0 ' +
                  (idx % 2 === 1 ? 'bg-surface/60' : '')
                }
              >
                <div className="pt-1">
                  <div className="font-display text-3xl text-ink">
                    {dayShort(date)}
                  </div>
                  <div className="mt-1 text-xs text-muted">
                    {date}
                  </div>
                </div>

                {COLS.map(({ slot, label }) => {
                  const slotItems = daySlots.get(slot) ?? []
                  return (
                    <div key={slot}>
                      <div className="meta mb-3 text-muted" style={{ letterSpacing: '0.14em' }}>
                        {label}
                      </div>
                      {slotItems.length === 0 ? (
                        <div className="text-sm italic text-muted-soft">—</div>
                      ) : (
                        <ul className="space-y-2.5">
                          {slotItems.map((item) => (
                            <li key={item.id}>
                              <DishChip
                                name={item.display_name ?? item.recipe?.name ?? 'Untitled'}
                                imageUrl={item.recipe?.image_url}
                              />
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )
                })}

                <div className="pt-2 text-right">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-ink/60">
                    ↗
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!session && (
        <div className="pt-4">
          <SignIn />
        </div>
      )}
    </div>
  )
}

export const _dayLabel = (iso: string) => `${dayShort(iso)} ${dayNumber(iso)}`
