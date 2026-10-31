import IngredientRow from './IngredientRow'
import type { ShoppingItem } from '../lib/data'

type Props = {
  label: string
  items: ShoppingItem[]
  open: boolean
  canEdit: boolean
  onToggle: () => void
  onItemToggleHave: (id: string, next: boolean) => void
  onItemEditQuantity: (id: string, next: string) => void
}

export default function IngredientCategory({
  label, items, open, canEdit, onToggle, onItemToggleHave, onItemEditQuantity,
}: Props) {
  return (
    <section className="overflow-hidden rounded-xl">
      <button
        onClick={onToggle}
        className={
          'flex w-full items-center justify-between gap-4 border border-sage-strong/50 bg-sage px-6 py-5 text-left transition hover:border-sage-strong ' +
          (open ? 'rounded-t-xl' : 'rounded-xl')
        }
        aria-expanded={open}
      >
        <h3 className="font-display text-2xl text-ink">{label}</h3>
        <div className="flex items-center gap-4">
          <span className="meta text-ink/70" style={{ letterSpacing: '0.14em' }}>
            {items.length} items
          </span>
          <span className="text-ink text-xl" aria-hidden>{open ? '×' : '+'}</span>
        </div>
      </button>

      {open && (
        <div className="rounded-b-xl border border-t-0 border-sage-strong/40 bg-card">
          <div className="grid grid-cols-[auto_1.5fr_1.3fr_auto_1.4fr] gap-4 border-b border-border bg-surface/60 px-4 py-2 text-[10px] uppercase tracking-wider text-muted">
            <div className="w-11" />
            <div>Ingredient</div>
            <div>Quantity · editable</div>
            <div className="text-center">Have</div>
            <div>Used in</div>
          </div>
          {items.length === 0 ? (
            <p className="p-4 text-sm italic text-muted-soft">No items in this category.</p>
          ) : (
            items.map((it) => (
              <IngredientRow
                key={it.id}
                item={it}
                canEdit={canEdit}
                onToggleHave={(next) => onItemToggleHave(it.id, next)}
                onEditQuantity={(next) => onItemEditQuantity(it.id, next)}
              />
            ))
          )}
        </div>
      )}
    </section>
  )
}
