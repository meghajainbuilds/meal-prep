import { useCallback, useEffect, useMemo, useState } from 'react'
import { useOutletContext, useSearchParams } from 'react-router-dom'
import type { AppContext } from '../App'
import MealCard from '../components/MealCard'
import AddDishModal from '../components/AddDishModal'
import SampleMenuPicker from '../components/SampleMenuPicker'
import PlannedEstimate from '../components/PlannedEstimate'
import RecipeModal from '../components/RecipeModal'
import SignIn from '../components/SignIn'
import DatePicker from '../components/DatePicker'
import {
  addMealPlanItem, applySampleMenu, clearSlotAteLog, deleteMealPlanItem,
  dayShort, dayNumber, getActualEatingForDate, getMealPlanForWeek,
  groupBySlot, mondayOf, SLOT_LABEL, SLOT_TIME, updateMealPlanItem, upsertSlotAteLog,
  weekDates,
  type ActualEatingLog, type AteStatus, type MealPlanItem,
} from '../lib/data'

const SLOTS: MealPlanItem['slot'][] = ['breakfast', 'midmorning', 'lunch', 'dinner', 'evening']

export default function Day() {
  const { session, activeWeek, allWeeks } = useOutletContext<AppContext>()
  const canEdit = !!session

  const [items, setItems] = useState<MealPlanItem[]>([])
  const [ateLogs, setAteLogs] = useState<ActualEatingLog[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [addSlot, setAddSlot] = useState<MealPlanItem['slot']>('breakfast')
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeDate, setActiveDate] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [openRecipe, setOpenRecipe] = useState<string | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()

  const dates = useMemo(() => (activeWeek ? weekDates(activeWeek.week_start) : []), [activeWeek?.week_start])

  useEffect(() => {
    if (dates.length === 0) return
    const requested = searchParams.get('date')
    const today = new Date().toISOString().slice(0, 10)
    setActiveDate((prev) => {
      if (requested && dates.includes(requested)) return requested
      // If the previously-chosen date belongs to this week, keep it;
      // otherwise land on today-or-next, else the first day of the week.
      if (prev && dates.includes(prev)) return prev
      return dates.find((d) => d >= today) ?? dates[0]
    })
  }, [dates, searchParams])

  const [pickerError, setPickerError] = useState<string | null>(null)

  function pickDate(d: string) {
    const weekStart = mondayOf(d)
    const target = allWeeks.find((w) => w.week_start === weekStart)
    if (target) {
      setPickerError(null)
      setActiveDate(d)
      setSearchParams({ week: target.id, date: d }, { replace: false })
    } else {
      setPickerError(`No plan for the week of ${weekStart} yet.`)
    }
  }

  const refreshPlan = useCallback(async () => {
    if (!activeWeek) return
    const data = await getMealPlanForWeek(activeWeek.id)
    setItems(data)
  }, [activeWeek?.id])

  const refreshAte = useCallback(async (date: string) => {
    if (!canEdit) { setAteLogs([]); return }
    const data = await getActualEatingForDate(date)
    setAteLogs(data)
  }, [canEdit])

  useEffect(() => {
    if (!activeWeek || !activeDate) { setLoading(false); return }
    let cancelled = false
    setLoading(true)
    Promise.all([refreshPlan(), refreshAte(activeDate)])
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [activeWeek?.id, activeDate, refreshPlan, refreshAte])

  if (!activeWeek) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <h2 className="mb-2 text-2xl font-medium text-ink">No week yet.</h2>
        <p className="mb-6 text-muted">Sign in and let Friday's schedule draft the first one.</p>
        {!session && <SignIn />}
      </div>
    )
  }

  const dayItems = activeDate ? items.filter((i) => i.day_date === activeDate) : []
  const bySlot = groupBySlot(dayItems)
  const ateBySlot = new Map<string, ActualEatingLog>()
  for (const a of ateLogs) {
    if (a.item_name === '__slot__') ateBySlot.set(a.slot, a)
  }

  async function handleAddDish(payload: Parameters<Parameters<typeof AddDishModal>[0]['onSubmit']>[0]) {
    if (!activeWeek || !activeDate) return
    try {
      const existing = (bySlot.get(payload.slot) ?? []).length
      await addMealPlanItem({
        week_id: activeWeek.id,
        day_date: activeDate,
        slot: payload.slot,
        recipe_id: payload.recipe_id,
        display_name: payload.display_name,
        order_index: existing,
      })
      await refreshPlan()
    } catch (e) {
      setError(String((e as Error).message ?? e))
    }
  }

  async function handleRemove(id: string) {
    try {
      await deleteMealPlanItem(id)
      await refreshPlan()
    } catch (e) {
      setError(String((e as Error).message ?? e))
    }
  }

  async function handlePlateNote(slot: MealPlanItem['slot'], text: string) {
    const first = (bySlot.get(slot) ?? [])[0]
    if (!first) return
    try {
      await updateMealPlanItem(first.id, { custom_notes: text || null })
      await refreshPlan()
    } catch (e) {
      setError(String((e as Error).message ?? e))
    }
  }

  async function handleAte(slot: MealPlanItem['slot'], status: AteStatus | null, notes: string | null) {
    if (!activeDate) return
    try {
      if (status === null) {
        await clearSlotAteLog(activeDate, slot)
      } else {
        await upsertSlotAteLog({ day_date: activeDate, slot, status, notes })
      }
      await refreshAte(activeDate)
    } catch (e) {
      setError(String((e as Error).message ?? e))
    }
  }

  async function handleApplyMenu(menuKey: string) {
    if (!activeWeek || !activeDate) return
    try {
      await applySampleMenu(activeWeek.id, activeDate, menuKey)
      await refreshPlan()
    } catch (e) {
      setError(String((e as Error).message ?? e))
    }
  }

  return (
    <div className="space-y-8">
      <section className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className="eyebrow mb-3">Day view</div>
          <h2 className="font-display text-4xl font-normal text-ink">
            {activeDate ? formatLong(activeDate) : '—'}
          </h2>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          {activeDate && (
            <DatePicker date={activeDate} onChange={pickDate} stepDays={1} />
          )}
          {canEdit && (
            <>
              <button
                onClick={() => setMenuOpen(true)}
                className="rounded-full border border-border bg-card px-4 py-2 text-sm text-ink hover:border-ink"
              >
                Apply a sample menu
              </button>
              <button
                onClick={() => { setAddSlot('breakfast'); setAddOpen(true) }}
                className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-surface hover:bg-ink-soft"
              >
                + Add planned meal
              </button>
            </>
          )}
        </div>
      </section>
      {pickerError && (
        <p className="text-sm text-accent">{pickerError}</p>
      )}

      {dates.length > 0 && (
        <div className="grid grid-cols-7 gap-2">
          {dates.map((d) => {
            const isActive = d === activeDate
            return (
              <button
                key={d}
                onClick={() => pickDate(d)}
                className={
                  'rounded-md border px-3 py-3 text-center transition ' +
                  (isActive
                    ? 'border-ink bg-ink text-surface'
                    : 'border-border bg-card text-ink hover:border-muted-soft')
                }
              >
                <div className="text-xs font-medium">{dayShort(d)}</div>
                <div className="mt-1 font-display text-xl">{String(dayNumber(d)).padStart(2, '0')}</div>
              </button>
            )
          })}
        </div>
      )}

      {!session && (
        <div className="rounded-xl border border-dashed border-border bg-surface/50 p-4 text-sm text-muted">
          Signed-out view. Sign in to log what you actually ate or edit the plan.
          <div className="mt-3"><SignIn /></div>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-accent/40 bg-accent/10 p-3 text-sm text-accent">
          {error} <button onClick={() => setError(null)} className="ml-2 underline">dismiss</button>
        </div>
      )}

      {loading ? (
        <p className="text-muted">Loading day…</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
          <ol className="space-y-4">
            {SLOTS.map((slot) => (
              <li key={slot} className="relative grid grid-cols-[4.5rem_1fr] gap-4">
                <div className="pt-6 text-right">
                  <div className="font-display text-lg text-ink/70">
                    {SLOT_TIME[slot].replace(/\s?[AP]M/, '')}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-soft">
                    {SLOT_TIME[slot].slice(-2)}
                  </div>
                </div>
                <div className="relative">
                  <span
                    aria-hidden
                    className="absolute -left-5 top-9 h-3 w-3 rounded-full border-2 border-ink bg-card"
                  />
                  <MealCard
                    slot={slot}
                    slotLabel={SLOT_LABEL[slot]}
                    slotTime={SLOT_TIME[slot]}
                    items={bySlot.get(slot) ?? []}
                    canEdit={canEdit}
                    ate={ateBySlot.get(slot) ?? null}
                    onAddDish={() => { setAddSlot(slot); setAddOpen(true) }}
                    onRemoveItem={handleRemove}
                    onEditPlateNote={(text) => handlePlateNote(slot, text)}
                    onAteChange={(status, notes) => handleAte(slot, status, notes)}
                    onDishClick={(recipeId) => setOpenRecipe(recipeId)}
                  />
                </div>
              </li>
            ))}
          </ol>

          <PlannedEstimate items={dayItems} />
        </div>
      )}

      <AddDishModal
        open={addOpen}
        defaultSlot={addSlot}
        onClose={() => setAddOpen(false)}
        onSubmit={handleAddDish}
      />
      <SampleMenuPicker
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onApply={handleApplyMenu}
      />
      <RecipeModal recipeId={openRecipe} onClose={() => setOpenRecipe(null)} />
    </div>
  )
}

function formatLong(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'short', day: 'numeric', year: 'numeric',
  })
}
