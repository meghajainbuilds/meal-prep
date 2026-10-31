import { useEffect, useState } from 'react'
import { useNavigate, useOutletContext, useSearchParams } from 'react-router-dom'
import type { AppContext } from '../App'
import DishChip from '../components/DishChip'
import RecipeModal from '../components/RecipeModal'
import SignIn from '../components/SignIn'
import DatePicker from '../components/DatePicker'
import {
  dayShort, dayLong, dayNumber, monthShort,
  getMealPlanForWeek, groupByDay, groupBySlot,
  mondayOf, weekDates,
  type MealPlanItem,
} from '../lib/data'

const COLS: { slot: MealPlanItem['slot']; label: string }[] = [
  { slot: 'breakfast', label: 'Breakfast' },
  { slot: 'lunch', label: 'Lunch' },
  { slot: 'dinner', label: 'Dinner' },
]

export default function Week() {
  const { session, activeWeek, allWeeks } = useOutletContext<AppContext>()
  const navigate = useNavigate()
  const [, setSearchParams] = useSearchParams()
  const [items, setItems] = useState<MealPlanItem[]>([])
  const [loading, setLoading] = useState(true)
  const [openRecipe, setOpenRecipe] = useState<string | null>(null)
  const [pickerError, setPickerError] = useState<string | null>(null)

  function onDateChange(iso: string) {
    const weekStart = mondayOf(iso)
    const target = allWeeks.find((w) => w.week_start === weekStart)
    if (target) {
      setPickerError(null)
      setSearchParams({ week: target.id })
    } else {
      setPickerError(`No plan generated for the week of ${monthShort(weekStart)} ${dayNumber(weekStart)} yet.`)
    }
  }

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
      <section className="space-y-6">
        <div>
          <div className="eyebrow mb-3">Weekly menu</div>
          <h2 className="font-display text-4xl font-normal text-ink md:text-5xl">
            Week of {dayShort(activeWeek.week_start)}, {monthShort(activeWeek.week_start)} {dayNumber(activeWeek.week_start)}, {activeWeek.week_start.slice(0, 4)}.
          </h2>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <DatePicker date={activeWeek.week_start} onChange={onDateChange} stepDays={7} />
        </div>
        {pickerError && (
          <p className="text-sm text-accent">{pickerError}</p>
        )}
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
                  'relative grid grid-cols-[7rem_1fr_1fr_1fr_2rem] gap-4 border-b border-border p-6 last:border-b-0 transition hover:bg-sage/20 ' +
                  (idx % 2 === 1 ? 'bg-surface/60' : '')
                }
              >
                <button
                  type="button"
                  aria-label={`Open ${dayLong(date)}`}
                  onClick={() => navigate(`/day?week=${activeWeek.id}&date=${date}`)}
                  className="absolute inset-0 z-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-inset focus:ring-ink/40"
                />
                <div className="pointer-events-none relative pt-1">
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
                    <div key={slot} className="relative">
                      <div className="meta mb-3 text-muted" style={{ letterSpacing: '0.14em' }}>
                        {label}
                      </div>
                      {slotItems.length === 0 ? (
                        <div className="text-sm italic text-muted-soft">—</div>
                      ) : (
                        <ul className="space-y-2.5">
                          {slotItems.map((item) => (
                            <li key={item.id} className="relative z-10">
                              <DishChip
                                name={item.display_name ?? item.recipe?.name ?? 'Untitled'}
                                imageUrl={item.recipe?.image_url}
                                onClick={item.recipe_id ? () => setOpenRecipe(item.recipe_id!) : undefined}
                              />
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )
                })}

                <div className="pointer-events-none relative pt-2 text-right">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-ink/60">
                    →
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

      <RecipeModal recipeId={openRecipe} onClose={() => setOpenRecipe(null)} />
    </div>
  )
}

export const _dayLabel = (iso: string) => `${dayShort(iso)} ${dayNumber(iso)}`
