import { useEffect, useRef, useState } from 'react'
import type { ShoppingItem } from '../lib/data'

type Props = {
  item: ShoppingItem
  canEdit: boolean
  onToggleHave: (next: boolean) => void
  onEditQuantity: (next: string) => void
}

const INGREDIENT_COLORS = ['#d9c6a8', '#c4b4a3', '#c6c1a4', '#d8b89f', '#c8cfa8', '#b9c7b0']
function hash(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

export default function IngredientRow({ item, canEdit, onToggleHave, onEditQuantity }: Props) {
  const [qty, setQty] = useState(item.quantity ?? '')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { setQty(item.quantity ?? '') }, [item.id, item.quantity])

  function debounceQty(next: string) {
    setQty(next)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => onEditQuantity(next), 500)
  }

  const bg = INGREDIENT_COLORS[hash(item.name) % INGREDIENT_COLORS.length]
  const initial = item.name.replace(/[^A-Za-z]/g, '').charAt(0).toUpperCase() || '•'

  return (
    <div className="grid grid-cols-[auto_1.5fr_1.3fr_auto_1.4fr] items-center gap-4 border-b border-border/70 px-4 py-3 last:border-b-0">
      {item.image_url ? (
        <img
          src={item.image_url}
          alt=""
          className="h-11 w-11 shrink-0 rounded-md object-cover"
        />
      ) : (
        <div
          aria-hidden
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-sm font-medium text-ink/70"
          style={{ background: bg }}
        >
          {initial}
        </div>
      )}

      <div className="font-medium text-ink">{item.name}</div>

      {canEdit ? (
        <input
          value={qty}
          onChange={(e) => debounceQty(e.target.value)}
          placeholder="quantity"
          className="w-full rounded-md border border-border bg-card px-2 py-1.5 text-sm text-ink placeholder:text-muted-soft focus:border-ink focus:outline-none"
        />
      ) : (
        <div className="rounded-md border border-border/60 bg-card px-2 py-1.5 text-sm text-ink/80">
          {qty || <span className="italic text-muted-soft">—</span>}
        </div>
      )}

      <HaveBox checked={item.have} onChange={onToggleHave} disabled={!canEdit} />

      <div className="flex flex-wrap gap-1.5">
        {item.used_in_recipes.length === 0 ? (
          <span className="text-xs italic text-muted-soft">—</span>
        ) : (
          item.used_in_recipes.slice(0, 4).map((r) => {
            const rbg = INGREDIENT_COLORS[hash(r.name) % INGREDIENT_COLORS.length]
            const rInit = r.name.replace(/[^A-Za-z]/g, '').charAt(0).toUpperCase() || '•'
            return (
              <span
                key={r.id}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-xs text-ink/80"
                title={r.name}
              >
                {r.image_url ? (
                  <img src={r.image_url} alt="" className="h-5 w-5 rounded object-cover" />
                ) : (
                  <span
                    aria-hidden
                    className="flex h-5 w-5 items-center justify-center rounded text-[10px] font-medium text-ink/70"
                    style={{ background: rbg }}
                  >
                    {rInit}
                  </span>
                )}
                <span className="truncate max-w-[9rem]">{r.name}</span>
              </span>
            )
          })
        )}
        {item.used_in_recipes.length > 4 && (
          <span className="text-xs text-muted-soft">+{item.used_in_recipes.length - 4}</span>
        )}
      </div>
    </div>
  )
}

function HaveBox({ checked, onChange, disabled }: { checked: boolean; onChange: (next: boolean) => void; disabled: boolean }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      aria-pressed={checked}
      aria-label={checked ? 'Marked Have' : 'Mark as Have'}
      className={
        'flex h-6 w-6 items-center justify-center rounded border-2 transition ' +
        (checked
          ? 'border-ink bg-ink text-surface'
          : 'border-border bg-card text-transparent hover:border-ink') +
        (disabled ? ' opacity-60 cursor-not-allowed' : ' cursor-pointer')
      }
    >
      <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3">
        <path d="M4 10l4 4 8-8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}

