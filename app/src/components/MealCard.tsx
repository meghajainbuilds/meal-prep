import { useEffect, useRef, useState } from 'react'
import DishChip from './DishChip'
import type { ActualEatingLog, AteStatus, MealPlanItem } from '../lib/data'

type Props = {
  slot: MealPlanItem['slot']
  slotLabel: string
  slotTime: string
  items: MealPlanItem[]
  canEdit: boolean
  ate: ActualEatingLog | null
  onAddDish: () => void
  onRemoveItem: (id: string) => void
  onEditPlateNote: (plateText: string) => void
  onAteChange: (status: AteStatus | null, notes: string | null) => void
}

export default function MealCard({
  slotLabel, slotTime, items, canEdit,
  ate, onAddDish, onRemoveItem, onEditPlateNote, onAteChange,
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

  const status = ate?.status ?? null
  const isEmpty = items.length === 0

  return (
    <div className="relative rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-start justify-between gap-6">
        <div>
          <div className="meta text-muted" style={{ letterSpacing: '0.14em' }}>{slotTime}</div>
          <h3 className="mt-1 font-display text-2xl font-normal text-ink">{slotLabel}</h3>
        </div>
        <div className="text-right text-xs uppercase tracking-wider text-muted-soft">
          {items.length === 0 ? 'Empty' : `${items.length} ${items.length === 1 ? 'dish' : 'dishes'}`}
        </div>
      </div>

      <div className="mt-5 grid gap-6 md:grid-cols-[1fr_1fr]">
        <div>
          {isEmpty ? (
            <p className="text-sm italic text-muted-soft">No dishes planned.</p>
          ) : (
            <ul className="space-y-3">
              {items.map((item) => (
                <li key={item.id} className="group flex items-center justify-between gap-3">
                  <DishChip
                    name={item.display_name ?? item.recipe?.name ?? 'Untitled'}
                    imageUrl={item.recipe?.image_url}
                    size="md"
                  />
                  {canEdit && (
                    <button
                      onClick={() => onRemoveItem(item.id)}
                      className="opacity-0 transition group-hover:opacity-100 text-xs text-muted hover:text-accent"
                      aria-label={`Remove ${item.display_name ?? item.recipe?.name}`}
                    >
                      Remove
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {canEdit && (
            <button
              onClick={onAddDish}
              className="mt-4 text-sm font-medium text-accent hover:underline"
            >
              + Add dish
            </button>
          )}
        </div>

        <div className="rounded-xl border border-sage-strong/60 bg-sage/50 p-4">
          <div className="meta mb-2 text-ink/70" style={{ letterSpacing: '0.14em' }}>My plate</div>
          {canEdit ? (
            <textarea
              value={plateText}
              onChange={(e) => debouncePlate(e.target.value)}
              placeholder="e.g. half plate greens, 1 cup rice, 1 roti"
              className="w-full resize-none rounded-md border border-border/60 bg-card/80 p-2 text-sm text-ink placeholder:text-muted-soft focus:border-ink focus:outline-none"
              rows={3}
              disabled={isEmpty}
            />
          ) : (
            <p className="text-sm text-ink/80">
              {plateText || <span className="italic text-muted-soft">—</span>}
            </p>
          )}
        </div>
      </div>

      {canEdit && (
        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-border pt-4">
          <AteButton
            label="Ate the whole meal"
            active={status === 'as_planned'}
            tone="ink"
            onClick={() => {
              if (status === 'as_planned') onAteChange(null, null)
              else onAteChange('as_planned', null)
            }}
          />
          <AteButton
            label="Ate something else"
            active={status === 'other' || status === 'substituted'}
            tone="accent"
            onClick={() => {
              if (status === 'other' || status === 'substituted') {
                setShowNote(false)
                onAteChange(null, null)
              } else {
                setShowNote(true)
                onAteChange('other', noteDraft || null)
              }
            }}
          />
          {status && (
            <button
              onClick={() => setShowNote((s) => !s)}
              className="ml-auto text-xs text-muted hover:text-ink"
            >
              {showNote ? 'Hide note' : 'Check what you ate'}
            </button>
          )}
        </div>
      )}

      {canEdit && showNote && (
        <div className="mt-3">
          <textarea
            value={noteDraft}
            onChange={(e) => debounceNote(e.target.value)}
            placeholder={status === 'as_planned' ? 'Optional notes…' : 'What did you eat instead?'}
            className="w-full resize-none rounded-md border border-border bg-card p-2 text-sm text-ink placeholder:text-muted-soft focus:border-ink focus:outline-none"
            rows={2}
          />
        </div>
      )}
    </div>
  )
}

function AteButton({
  label, active, tone, onClick,
}: { label: string; active: boolean; tone: 'ink' | 'accent'; onClick: () => void }) {
  const base = 'rounded-full border px-4 py-1.5 text-xs font-medium transition'
  const activeCls = tone === 'ink'
    ? 'border-ink bg-ink text-surface'
    : 'border-accent bg-accent text-surface'
  const idle = 'border-border bg-card text-muted hover:border-muted-soft hover:text-ink'
  return (
    <button onClick={onClick} className={`${base} ${active ? activeCls : idle}`}>
      {label}
    </button>
  )
}
