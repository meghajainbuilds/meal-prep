import { useEffect, useRef, useState } from 'react'
import type { ActualEatingLog, AteStatus, MealPlanItem } from '../lib/data'

type Props = {
  slot: MealPlanItem['slot']
  slotLabel: string
  slotTime: string
  items: MealPlanItem[]
  canEdit: boolean
  ate: ActualEatingLog | null                       // slot-level ate log
  ateByItemId: Map<string, ActualEatingLog>          // per-item ate logs, keyed by meal_plan_item.id
  onAddDish: () => void
  onRemoveSlot: () => void
  onEditPlateNote: (plateText: string) => void
  onAteChange: (status: AteStatus | null, notes: string | null) => void
  onItemAteChange: (itemId: string, checked: boolean) => void
  onDishClick?: (recipeId: string) => void
}

function slotTitle(slotLabel: string, items: MealPlanItem[]): string {
  if (items.length === 0) return `No ${slotLabel.toLowerCase()} planned`
  const names = items.map((i) => i.display_name ?? i.recipe?.name ?? 'Untitled')
  if (names.length === 1) return names[0]
  return `${names[0]} + ${names[1]}`
}

export default function MealCard({
  slotLabel, slotTime, items, canEdit,
  ate, ateByItemId, onAddDish, onRemoveSlot, onEditPlateNote, onAteChange,
  onItemAteChange, onDishClick,
}: Props) {
  const firstItem = items[0]
  const [plateText, setPlateText] = useState(firstItem?.custom_notes ?? '')
  const [noteDraft, setNoteDraft] = useState(ate?.notes ?? '')
  const [showNote, setShowNote] = useState(ate?.status === 'other' || ate?.status === 'substituted')
  const plateTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { setPlateText(firstItem?.custom_notes ?? '') }, [firstItem?.id, firstItem?.custom_notes])
  useEffect(() => {
    setNoteDraft(ate?.notes ?? '')
    setShowNote(ate?.status === 'other' || ate?.status === 'substituted')
  }, [ate?.id, ate?.status, ate?.notes])

  function debouncePlate(next: string) {
    setPlateText(next)
    if (plateTimer.current) clearTimeout(plateTimer.current)
    plateTimer.current = setTimeout(() => onEditPlateNote(next), 600)
  }

  function debounceNote(next: string) {
    setNoteDraft(next)
    if (noteTimer.current) clearTimeout(noteTimer.current)
    noteTimer.current = setTimeout(() => onAteChange(ate?.status ?? 'other', next), 500)
  }

  const slotStatus = ate?.status ?? null
  const isEmpty = items.length === 0
  const title = slotTitle(slotLabel, items)

  async function removeWithConfirm() {
    if (isEmpty) return
    if (window.confirm(`Remove all dishes from ${slotLabel.toLowerCase()}?`)) {
      onRemoveSlot()
    }
  }

  return (
    <div className={`rounded-2xl border border-border p-6 shadow-sm ${isEmpty ? 'bg-sage/30' : 'bg-card'}`}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">

        {/* LEFT: slot header + MY PLATE + controls */}
        <div className="min-w-0">
          <div className="meta mb-2 text-muted" style={{ letterSpacing: '0.14em' }}>
            {slotTime.toUpperCase()} · {slotLabel.toUpperCase()} · PLANNED
          </div>
          <h3 className="font-display text-2xl font-normal leading-tight text-ink md:text-3xl">
            {title}
          </h3>

          <div className="mt-5 rounded-xl bg-sage/50 p-4">
            <div className="meta mb-2 text-ink/70" style={{ letterSpacing: '0.14em' }}>MY PLATE · ONE ADULT</div>
            {canEdit && !isEmpty ? (
              <textarea
                value={plateText}
                onChange={(e) => debouncePlate(e.target.value)}
                placeholder="e.g. half plate greens, 1 cup rice, 1 roti"
                className="w-full resize-none bg-transparent text-sm text-ink placeholder:text-muted-soft focus:outline-none"
                rows={3}
              />
            ) : (
              <p className="text-sm text-ink/80">
                {plateText || <span className="italic text-muted-soft">—</span>}
              </p>
            )}
          </div>

          {canEdit && (
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
              <button
                onClick={onAddDish}
                className="font-medium text-ink underline-offset-4 hover:underline"
              >
                Edit planned meal
              </button>
              {!isEmpty && (
                <button
                  onClick={removeWithConfirm}
                  className="font-medium text-ink underline-offset-4 hover:underline hover:text-accent"
                >
                  Remove
                </button>
              )}
            </div>
          )}
        </div>

        {/* RIGHT: dish photo cards */}
        <div>
          {isEmpty ? (
            <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-8 text-sm italic text-muted-soft">
              {canEdit ? 'Add dishes to plan this slot.' : 'No dishes planned.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => {
                const name = item.display_name ?? item.recipe?.name ?? 'Untitled'
                const checked = !!ateByItemId.get(item.id)
                const clickable = item.recipe_id && onDishClick
                return (
                  <div key={item.id} className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
                    <button
                      type="button"
                      onClick={clickable ? () => onDishClick!(item.recipe_id!) : undefined}
                      disabled={!clickable}
                      className={`relative block aspect-square w-full ${clickable ? 'cursor-pointer hover:opacity-95' : 'cursor-default'}`}
                      aria-label={clickable ? `Open recipe for ${name}` : name}
                    >
                      {item.recipe?.image_url ? (
                        <img
                          src={item.recipe.image_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-sage/60 text-4xl font-display text-ink/40">
                          {name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </button>
                    <div className="flex flex-1 flex-col justify-between gap-2 p-3">
                      <p className="text-sm text-ink">{name}</p>
                      {canEdit && (
                        <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => onItemAteChange(item.id, e.target.checked)}
                            className="h-4 w-4 rounded border-border accent-ink"
                          />
                          <span className="font-semibold">Ate it</span>
                        </label>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM: slot-level ate section */}
      {canEdit && !isEmpty && (
        <div className="mt-6 border-t border-border pt-4">
          <div className="flex flex-wrap items-center gap-5 text-sm">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={slotStatus === 'as_planned'}
                onChange={(e) => {
                  if (e.target.checked) onAteChange('as_planned', null)
                  else onAteChange(null, null)
                }}
                className="h-4 w-4 rounded border-border accent-ink"
              />
              <span className="font-semibold text-ink">Ate the whole meal</span>
            </label>
            <button
              onClick={() => {
                if (slotStatus === 'other' || slotStatus === 'substituted') {
                  setShowNote(false)
                  onAteChange(null, null)
                } else {
                  setShowNote(true)
                  onAteChange('other', noteDraft || null)
                }
              }}
              className={`underline-offset-4 hover:underline ${
                slotStatus === 'other' || slotStatus === 'substituted' ? 'text-accent font-semibold' : 'text-ink'
              }`}
            >
              Ate something else
            </button>
            <button
              onClick={() => setShowNote((s) => !s)}
              className="text-ink underline-offset-4 hover:underline"
            >
              {showNote ? 'Hide what you ate' : 'Check what you ate'}
            </button>
          </div>

          {showNote && (
            <div className="mt-3">
              <textarea
                value={noteDraft}
                onChange={(e) => debounceNote(e.target.value)}
                placeholder={slotStatus === 'as_planned' ? 'Optional notes…' : 'What did you eat instead?'}
                className="w-full resize-none rounded-md border border-border bg-card p-2 text-sm text-ink placeholder:text-muted-soft focus:border-ink focus:outline-none"
                rows={2}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
