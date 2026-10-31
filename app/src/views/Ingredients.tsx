import { useEffect, useMemo, useState } from 'react'
import { useOutletContext, useSearchParams } from 'react-router-dom'
import type { AppContext } from '../App'
import IngredientCategory from '../components/IngredientCategory'
import SignIn from '../components/SignIn'
import DatePicker from '../components/DatePicker'
import {
  addShoppingItem, dayLong, dayNumber, getShoppingItemsForWeek, getShoppingSuggestions,
  INGREDIENT_CATEGORIES, mondayOf, monthShort, updateShoppingItem,
  type ShoppingItem, type ShoppingSuggestion,
} from '../lib/data'

type Filter = 'all' | 'check'

export default function Ingredients() {
  const { session, activeWeek, allWeeks } = useOutletContext<AppContext>()
  const canEdit = !!session
  const [, setSearchParams] = useSearchParams()

  const [items, setItems] = useState<ShoppingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('all')
  const [open, setOpen] = useState<Record<string, boolean>>({
    fresh: true, pantry: false, alternatives: false,
  })
  const [error, setError] = useState<string | null>(null)
  const [pickerError, setPickerError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<ShoppingSuggestion[]>([])
  const [addOpen, setAddOpen] = useState(false)

  useEffect(() => {
    getShoppingSuggestions().then(setSuggestions).catch(() => { /* ignore */ })
  }, [])

  async function handleAdd(args: { name: string; category: string | null; quantity: string | null; isPantry: boolean; imageUrl: string | null }) {
    if (!activeWeek) return
    try {
      await addShoppingItem({
        week_id: activeWeek.id,
        name: args.name,
        category: args.category,
        quantity: args.quantity,
        is_pantry: args.isPantry,
        image_url: args.imageUrl,
      })
      const fresh = await getShoppingItemsForWeek(activeWeek.id)
      setItems(fresh)
      setAddOpen(false)
      // Refresh suggestions so the new item is available next time.
      getShoppingSuggestions().then(setSuggestions)
    } catch (e) {
      setError(String((e as Error).message ?? e))
    }
  }

  function onDateChange(iso: string) {
    const weekStart = mondayOf(iso)
    const target = allWeeks.find((w) => w.week_start === weekStart)
    if (target) {
      setPickerError(null)
      setSearchParams({ week: target.id })
    } else {
      setPickerError(`No plan for the week of ${monthShort(weekStart)} ${dayNumber(weekStart)} yet.`)
    }
  }

  useEffect(() => {
    if (!activeWeek) { setLoading(false); return }
    getShoppingItemsForWeek(activeWeek.id).then((data) => {
      setItems(data)
      setLoading(false)
    })
  }, [activeWeek?.id])

  const byCategory = useMemo(() => {
    const map = new Map<string, ShoppingItem[]>()
    for (const cat of INGREDIENT_CATEGORIES) map.set(cat.key, [])
    for (const it of items) {
      const key = it.category ?? 'fresh'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(it)
    }
    return map
  }, [items])

  // "To check" counts only Fresh + Pantry (not Alternatives), matching the prototype.
  const countable = items.filter((i) => i.category !== 'alternatives')
  const haveCount = countable.filter((i) => i.have).length
  const toCheckCount = countable.length - haveCount

  const filterItems = (list: ShoppingItem[]) =>
    filter === 'check' ? list.filter((i) => !i.have) : list

  async function toggleHave(id: string, next: boolean) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, have: next } : it)))
    try {
      await updateShoppingItem(id, { have: next })
    } catch (e) {
      setError(String((e as Error).message ?? e))
    }
  }

  async function editQty(id: string, next: string) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, quantity: next } : it)))
    try {
      await updateShoppingItem(id, { quantity: next })
    } catch (e) {
      setError(String((e as Error).message ?? e))
    }
  }

  function expandAll() {
    setOpen(Object.fromEntries(INGREDIENT_CATEGORIES.map((c) => [c.key, true])))
  }
  function collapseAll() {
    setOpen(Object.fromEntries(INGREDIENT_CATEGORIES.map((c) => [c.key, false])))
  }

  if (!activeWeek) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <h2 className="mb-2 text-2xl font-medium text-ink">No week yet.</h2>
        {!session && <SignIn />}
      </div>
    )
  }

  const dates = activeWeek.week_start
  const weekLabel = `Week of ${dayLong(dates)}, ${new Date(dates + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`

  return (
    <div className="space-y-8">
      <section>
        <div className="eyebrow mb-3">Shopping list</div>
        <div className="flex items-end justify-between gap-6">
          <div>
            <h2 className="font-display text-5xl font-normal text-ink">Ingredients.</h2>
            <p className="mt-1 text-sm text-muted">{weekLabel}</p>
          </div>
          <div className="flex items-end gap-3">
            {activeWeek && (
              <DatePicker date={activeWeek.week_start} onChange={onDateChange} stepDays={7} />
            )}
            <button
              onClick={() => window.print()}
              className="hidden h-9 rounded-full border border-border bg-card px-4 text-sm text-ink hover:border-ink md:inline-flex md:items-center"
            >
              Print list ↗
            </button>
          </div>
        </div>
        {pickerError && (
          <p className="mt-3 text-sm text-accent">{pickerError}</p>
        )}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <FilterPill active={filter === 'all'} onClick={() => setFilter('all')}>
            All ingredients
          </FilterPill>
          <FilterPill active={filter === 'check'} onClick={() => setFilter('check')}>
            Check / buy only
          </FilterPill>
          <span className="pl-2 text-sm text-muted">
            {haveCount} marked Have · {toCheckCount} to check
          </span>
        </div>

        <div className="flex items-center gap-5 text-sm">
          {canEdit && (
            <button
              onClick={() => setAddOpen((v) => !v)}
              className="font-medium text-accent hover:underline"
            >
              {addOpen ? 'Cancel' : '+ Add ingredient'}
            </button>
          )}
          <button onClick={expandAll} className="text-ink hover:underline">Expand all</button>
          <button onClick={collapseAll} className="text-ink hover:underline">Collapse all</button>
        </div>
      </div>

      {addOpen && (
        <AddIngredientRow
          suggestions={suggestions}
          onCancel={() => setAddOpen(false)}
          onAdd={handleAdd}
        />
      )}

      {!session && (
        <div className="rounded-xl border border-dashed border-border bg-surface/50 p-4 text-sm text-muted">
          Signed-out view. Sign in to edit quantities or mark Have.
          <div className="mt-3"><SignIn /></div>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-accent/40 bg-accent/10 p-3 text-sm text-accent">
          {error} <button onClick={() => setError(null)} className="ml-2 underline">dismiss</button>
        </div>
      )}

      {loading ? (
        <p className="text-muted">Loading ingredients…</p>
      ) : (
        <div className="space-y-4">
          {INGREDIENT_CATEGORIES.map((cat) => {
            const list = filterItems(byCategory.get(cat.key) ?? [])
            return (
              <IngredientCategory
                key={cat.key}
                label={cat.label}
                items={list}
                open={!!open[cat.key]}
                canEdit={canEdit}
                onToggle={() => setOpen((prev) => ({ ...prev, [cat.key]: !prev[cat.key] }))}
                onItemToggleHave={toggleHave}
                onItemEditQuantity={editQty}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={
        'rounded-full px-5 py-2 text-sm font-medium transition ' +
        (active
          ? 'bg-ink text-surface'
          : 'border border-border bg-card text-ink hover:border-ink')
      }
    >
      {children}
    </button>
  )
}

function AddIngredientRow({
  suggestions, onCancel, onAdd,
}: {
  suggestions: ShoppingSuggestion[]
  onCancel: () => void
  onAdd: (args: { name: string; category: string | null; quantity: string | null; isPantry: boolean; imageUrl: string | null }) => void
}) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState<string>('fresh')
  const [quantity, setQuantity] = useState('')
  const [isPantry, setIsPantry] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const listId = 'ingredient-suggest'

  // When the typed name matches an existing ingredient, prefill its category
  // and photo so repeat items reuse their image + bucket instead of being
  // retyped. Owner can still edit before saving.
  function onNameChange(next: string) {
    setName(next)
    const match = suggestions.find((s) => s.name.toLowerCase() === next.trim().toLowerCase())
    if (match) {
      setCategory(match.category ?? 'fresh')
      setIsPantry(match.is_pantry)
      setImageUrl(match.image_url)
    } else {
      setImageUrl(null)
    }
  }

  function submit() {
    if (!name.trim()) return
    onAdd({
      name: name.trim(),
      category,
      quantity: quantity.trim() || null,
      isPantry,
      imageUrl,
    })
    setName(''); setQuantity(''); setImageUrl(null)
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="grid grid-cols-[auto_1.5fr_1fr_1fr_auto_auto] items-center gap-3">
        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border border-border bg-sage/40">
          {imageUrl && (
            <img src={imageUrl} alt="" className="h-full w-full object-cover" />
          )}
        </div>
        <input
          autoFocus
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Ingredient name (start typing to pick existing)"
          list={listId}
          className="rounded-md border border-border bg-card px-2 py-1.5 text-sm text-ink placeholder:text-muted-soft focus:border-ink focus:outline-none"
        />
        <datalist id={listId}>
          {suggestions.map((s) => (
            <option key={s.name} value={s.name} />
          ))}
        </datalist>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-md border border-border bg-card px-2 py-1.5 text-sm text-ink focus:border-ink focus:outline-none"
        >
          {INGREDIENT_CATEGORIES.map((c) => (
            <option key={c.key} value={c.key}>{c.label}</option>
          ))}
        </select>
        <input
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="quantity (optional)"
          className="rounded-md border border-border bg-card px-2 py-1.5 text-sm text-ink placeholder:text-muted-soft focus:border-ink focus:outline-none"
        />
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={isPantry}
            onChange={(e) => setIsPantry(e.target.checked)}
            className="h-4 w-4 accent-ink"
          />
          Pantry
        </label>
        <div className="flex gap-2">
          <button onClick={submit} disabled={!name.trim()} className="rounded-full bg-ink px-3 py-1.5 text-xs font-medium text-surface disabled:opacity-40">Add</button>
          <button onClick={onCancel} className="text-xs text-muted hover:text-ink">Cancel</button>
        </div>
      </div>
    </div>
  )
}
