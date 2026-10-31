import { useEffect, useMemo, useState } from 'react'
import type { MealPlanItem, Recipe } from '../lib/data'
import { SLOT_LABEL, getAllRecipes } from '../lib/data'

type Props = {
  open: boolean
  defaultSlot: MealPlanItem['slot']
  onClose: () => void
  onSubmit: (payload: {
    slot: MealPlanItem['slot']
    recipe_id: string | null
    display_name: string | null
  }) => Promise<void> | void
}

const SLOTS: MealPlanItem['slot'][] = ['breakfast', 'midmorning', 'lunch', 'dinner', 'evening']

export default function AddDishModal({ open, defaultSlot, onClose, onSubmit }: Props) {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [slot, setSlot] = useState<MealPlanItem['slot']>(defaultSlot)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Recipe | null>(null)
  const [customName, setCustomName] = useState('')
  const [mode, setMode] = useState<'recipe' | 'custom'>('recipe')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setSlot(defaultSlot)
    setQuery('')
    setSelected(null)
    setCustomName('')
    setMode('recipe')
    getAllRecipes().then(setRecipes)
  }, [open, defaultSlot])

  const filtered = useMemo(() => {
    if (!query.trim()) return recipes
    const q = query.toLowerCase()
    return recipes.filter((r) => r.name.toLowerCase().includes(q) || (r.cuisine ?? '').toLowerCase().includes(q))
  }, [recipes, query])

  async function handleSubmit() {
    if (saving) return
    if (mode === 'recipe' && !selected) return
    if (mode === 'custom' && !customName.trim()) return
    setSaving(true)
    try {
      await onSubmit({
        slot,
        recipe_id: mode === 'recipe' ? selected!.id : null,
        display_name: mode === 'custom' ? customName.trim() : null,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 px-4 py-10"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-2xl text-ink">Add a dish</h3>
          <button onClick={onClose} className="text-muted hover:text-ink" aria-label="Close">×</button>
        </div>

        <div className="mt-5">
          <div className="meta mb-2 text-muted">Meal</div>
          <div className="flex flex-wrap gap-2">
            {SLOTS.map((s) => (
              <button
                key={s}
                onClick={() => setSlot(s)}
                className={
                  'rounded-full border px-3 py-1 text-xs ' +
                  (slot === s
                    ? 'border-ink bg-ink text-surface'
                    : 'border-border bg-card text-muted hover:text-ink')
                }
              >
                {SLOT_LABEL[s]}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <div className="flex items-center gap-4 border-b border-border">
            <TabBtn active={mode === 'recipe'} onClick={() => setMode('recipe')}>From recipes</TabBtn>
            <TabBtn active={mode === 'custom'} onClick={() => setMode('custom')}>Custom dish</TabBtn>
          </div>

          {mode === 'recipe' ? (
            <div className="mt-4">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or cuisine…"
                className="w-full rounded-md border border-border bg-card p-2 text-sm text-ink placeholder:text-muted-soft focus:border-ink focus:outline-none"
              />
              <div className="mt-3 max-h-72 overflow-y-auto rounded-md border border-border">
                {filtered.length === 0 ? (
                  <p className="p-4 text-sm italic text-muted-soft">No recipes match.</p>
                ) : (
                  <ul>
                    {filtered.map((r) => (
                      <li key={r.id}>
                        <button
                          onClick={() => setSelected(r)}
                          className={
                            'flex w-full items-center justify-between gap-3 border-b border-border px-3 py-2 text-left last:border-b-0 ' +
                            (selected?.id === r.id ? 'bg-sage/50' : 'hover:bg-surface/60')
                          }
                        >
                          <div>
                            <div className="text-sm font-medium text-ink">{r.name}</div>
                            {r.description && (
                              <div className="text-xs text-muted-soft line-clamp-1">{r.description}</div>
                            )}
                          </div>
                          {r.cuisine && (
                            <span className="shrink-0 text-xs uppercase tracking-wider text-muted-soft">
                              {r.cuisine}
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-4">
              <input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g. Leftover pizza"
                className="w-full rounded-md border border-border bg-card p-2 text-sm text-ink placeholder:text-muted-soft focus:border-ink focus:outline-none"
                autoFocus
              />
              <p className="mt-2 text-xs text-muted-soft">
                Added without a recipe. You can create a recipe later and relink.
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button onClick={onClose} className="text-sm text-muted hover:text-ink">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={saving || (mode === 'recipe' ? !selected : !customName.trim())}
            className="rounded-full bg-ink px-5 py-2 text-sm font-medium text-surface disabled:opacity-40"
          >
            {saving ? 'Adding…' : 'Add dish'}
          </button>
        </div>
      </div>
    </div>
  )
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={
        'relative -mb-px border-b-2 px-1 py-2 text-sm transition ' +
        (active ? 'border-ink text-ink' : 'border-transparent text-muted hover:text-ink')
      }
    >
      {children}
    </button>
  )
}
