import { useCallback, useEffect, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import type { AppContext } from '../App'
import SignIn from '../components/SignIn'
import WeekPicker from '../components/WeekPicker'
import {
  addPrepItem, deletePrepItem, getPrepSessionsForWeek, PREP_ACTIONS,
  updatePrepItem, updatePrepSessionNotes,
  type PrepAction, type PrepItem, type PrepSession,
} from '../lib/data'

export default function Prep() {
  const { session, activeWeek, allWeeks } = useOutletContext<AppContext>()
  const canEdit = !!session

  const [sessions, setSessions] = useState<PrepSession[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!activeWeek) return
    const data = await getPrepSessionsForWeek(activeWeek.id)
    setSessions(data)
    setActiveId((prev) => prev && data.some((s) => s.id === prev) ? prev : (data[0]?.id ?? null))
  }, [activeWeek?.id])

  useEffect(() => {
    if (!activeWeek) { setLoading(false); return }
    setLoading(true)
    refresh().finally(() => setLoading(false))
  }, [activeWeek?.id, refresh])

  const current = sessions.find((s) => s.id === activeId) ?? null

  function wrap<T extends unknown[]>(fn: (...args: T) => Promise<unknown>) {
    return async (...args: T) => {
      try { await fn(...args); await refresh() }
      catch (e) { setError(String((e as Error).message ?? e)) }
    }
  }

  const handleToggleDone = wrap(async (id: string, next: boolean) => updatePrepItem(id, { done: next }))
  const handleRemove = wrap(async (id: string) => deletePrepItem(id))
  const handleMove = wrap(async (id: string, newSessionId: string) => updatePrepItem(id, { session_id: newSessionId }))
  const handleEdit = wrap(async (id: string, patch: Partial<Pick<PrepItem, 'ingredient_name' | 'total_quantity' | 'cut_style'>>) => updatePrepItem(id, patch))
  const handleAdd = wrap(async (sessionId: string, action: PrepAction, ingredient_name: string, total_quantity: string | null, cut_style: string | null, nextOrder: number) =>
    addPrepItem({ session_id: sessionId, action, ingredient_name, total_quantity, cut_style, order_index: nextOrder }))
  const handleNotes = wrap(async (id: string, text: string) => updatePrepSessionNotes(id, text))

  if (!activeWeek) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <h2 className="mb-2 text-2xl font-medium text-ink">No week yet.</h2>
        {!session && <SignIn />}
      </div>
    )
  }

  const otherSession = sessions.find((s) => s.id !== activeId) ?? null

  return (
    <div className="space-y-8">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow mb-3">Prep sessions</div>
          <h2 className="font-display text-5xl font-normal text-ink">Prep for the week.</h2>
          <p className="mt-2 text-sm text-muted">
            Two batches. Session 1 is the big weekend prep; Session 2 is a midweek refresh.
          </p>
        </div>
        <WeekPicker activeWeek={activeWeek} allWeeks={allWeeks} />
      </section>

      {loading ? (
        <p className="text-muted">Loading prep…</p>
      ) : sessions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface/50 p-10 text-center text-muted">
          No prep sessions yet. Run <code>seed-prep-1</code> or add one.
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 border-b border-border">
            {sessions.map((s) => {
              const isActive = s.id === activeId
              const total = s.items.length
              const done = s.items.filter((i) => i.done).length
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveId(s.id)}
                  className={
                    'relative -mb-px flex items-center gap-3 border-b-2 px-5 py-3 text-sm transition ' +
                    (isActive ? 'border-ink text-ink' : 'border-transparent text-muted hover:text-ink')
                  }
                >
                  <span className="font-display text-xl">Session {s.session_number}</span>
                  {s.day_hint && <span className="text-xs text-muted-soft">· {s.day_hint}</span>}
                  <span
                    className={
                      'rounded-full px-2 py-0.5 text-[10px] font-medium ' +
                      (done === total && total > 0
                        ? 'bg-ink text-surface'
                        : 'bg-sage text-ink/80')
                    }
                  >
                    {done}/{total}
                  </span>
                </button>
              )
            })}
          </div>

          {error && (
            <div className="rounded-md border border-accent/40 bg-accent/10 p-3 text-sm text-accent">
              {error} <button onClick={() => setError(null)} className="ml-2 underline">dismiss</button>
            </div>
          )}

          {!session && (
            <div className="rounded-xl border border-dashed border-border bg-surface/50 p-4 text-sm text-muted">
              Signed-out view. Sign in to check items off, edit, or add.
              <div className="mt-3"><SignIn /></div>
            </div>
          )}

          {current && (
            <SessionBody
              session={current}
              canEdit={canEdit}
              moveTargetId={otherSession?.id ?? null}
              moveTargetNumber={otherSession?.session_number ?? null}
              onToggleDone={handleToggleDone}
              onRemove={handleRemove}
              onMove={handleMove}
              onEdit={handleEdit}
              onAdd={handleAdd}
              onNotes={handleNotes}
            />
          )}
        </>
      )}
    </div>
  )
}

type SessionBodyProps = {
  session: PrepSession
  canEdit: boolean
  moveTargetId: string | null
  moveTargetNumber: number | null
  onToggleDone: (id: string, next: boolean) => void
  onRemove: (id: string) => void
  onMove: (id: string, newSessionId: string) => void
  onEdit: (id: string, patch: Partial<Pick<PrepItem, 'ingredient_name' | 'total_quantity' | 'cut_style'>>) => void
  onAdd: (sessionId: string, action: PrepAction, name: string, quantity: string | null, cut: string | null, nextOrder: number) => void
  onNotes: (id: string, text: string) => void
}

function SessionBody(props: SessionBodyProps) {
  const { session, canEdit, moveTargetId, moveTargetNumber, onToggleDone, onRemove, onMove, onEdit, onAdd, onNotes } = props
  const [notesDraft, setNotesDraft] = useState(session.notes ?? '')
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { setNotesDraft(session.notes ?? '') }, [session.id, session.notes])

  function debounceNotes(next: string) {
    setNotesDraft(next)
    if (notesTimer.current) clearTimeout(notesTimer.current)
    notesTimer.current = setTimeout(() => onNotes(session.id, next), 600)
  }

  const grouped = new Map<PrepAction, PrepItem[]>()
  for (const action of PREP_ACTIONS) grouped.set(action.key, [])
  for (const it of session.items) grouped.get(it.action)!.push(it)

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
      <div className="space-y-6">
        {PREP_ACTIONS.map((action, idx) => (
          <PrepGroup
            key={action.key}
            number={idx + 1}
            label={action.label}
            action={action.key}
            items={grouped.get(action.key) ?? []}
            canEdit={canEdit}
            sessionId={session.id}
            moveTargetId={moveTargetId}
            moveTargetNumber={moveTargetNumber}
            onToggleDone={onToggleDone}
            onRemove={onRemove}
            onMove={onMove}
            onEdit={onEdit}
            onAdd={onAdd}
          />
        ))}
      </div>

      <aside className="sticky top-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="eyebrow mb-2">Session notes</div>
        <h3 className="font-display text-xl text-ink">
          Session {session.session_number}
          {session.day_hint && <span className="block text-sm font-sans text-muted">{session.day_hint}</span>}
        </h3>
        {canEdit ? (
          <textarea
            value={notesDraft}
            onChange={(e) => debounceNotes(e.target.value)}
            placeholder="Target time, equipment, what to parallelize…"
            className="mt-4 w-full resize-none rounded-md border border-border bg-card p-2 text-sm text-ink placeholder:text-muted-soft focus:border-ink focus:outline-none"
            rows={6}
          />
        ) : (
          <p className="mt-4 whitespace-pre-wrap text-sm text-ink/80">
            {notesDraft || <span className="italic text-muted-soft">No notes.</span>}
          </p>
        )}

        <div className="mt-6 border-t border-border pt-4 text-xs">
          <div className="meta mb-2 text-muted">By group</div>
          <ul className="space-y-1.5">
            {PREP_ACTIONS.map((a) => {
              const list = grouped.get(a.key) ?? []
              const done = list.filter((i) => i.done).length
              return (
                <li key={a.key} className="flex items-center justify-between">
                  <span className="text-muted">{a.label}</span>
                  <span className={list.length === 0 ? 'text-muted-soft italic' : 'text-ink'}>
                    {list.length === 0 ? '—' : `${done}/${list.length}`}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      </aside>
    </div>
  )
}

type GroupProps = {
  number: number
  label: string
  action: PrepAction
  items: PrepItem[]
  canEdit: boolean
  sessionId: string
  moveTargetId: string | null
  moveTargetNumber: number | null
  onToggleDone: SessionBodyProps['onToggleDone']
  onRemove: SessionBodyProps['onRemove']
  onMove: SessionBodyProps['onMove']
  onEdit: SessionBodyProps['onEdit']
  onAdd: SessionBodyProps['onAdd']
}

function PrepGroup(p: GroupProps) {
  const [addOpen, setAddOpen] = useState(false)
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <header className="flex items-center justify-between gap-3 border-b border-border bg-sage/60 px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-ink bg-card font-display text-sm text-ink">
            {p.number}
          </span>
          <h3 className="font-display text-xl text-ink">{p.label}</h3>
          <span className="text-xs text-muted">{p.items.filter((i) => i.done).length}/{p.items.length}</span>
        </div>
        {p.canEdit && (
          <button
            onClick={() => setAddOpen((v) => !v)}
            className="text-sm font-medium text-accent hover:underline"
          >
            {addOpen ? 'Cancel' : '+ Add item'}
          </button>
        )}
      </header>

      {addOpen && (
        <AddItemRow
          onCancel={() => setAddOpen(false)}
          onAdd={(name, qty, cut) => {
            p.onAdd(p.sessionId, p.action, name, qty, cut, p.items.length)
            setAddOpen(false)
          }}
        />
      )}

      {p.items.length === 0 && !addOpen ? (
        <p className="px-5 py-4 text-sm italic text-muted-soft">Nothing in this group.</p>
      ) : (
        <ul>
          {p.items.map((it) => (
            <li key={it.id}>
              <PrepItemRow
                item={it}
                canEdit={p.canEdit}
                moveTargetId={p.moveTargetId}
                moveTargetNumber={p.moveTargetNumber}
                onToggleDone={p.onToggleDone}
                onRemove={p.onRemove}
                onMove={p.onMove}
                onEdit={p.onEdit}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

const ITEM_COLORS = ['#d9c6a8', '#c4b4a3', '#c6c1a4', '#d8b89f', '#c8cfa8', '#b9c7b0']
function hash(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

type RowProps = {
  item: PrepItem
  canEdit: boolean
  moveTargetId: string | null
  moveTargetNumber: number | null
  onToggleDone: SessionBodyProps['onToggleDone']
  onRemove: SessionBodyProps['onRemove']
  onMove: SessionBodyProps['onMove']
  onEdit: SessionBodyProps['onEdit']
}

function PrepItemRow(r: RowProps) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(r.item.ingredient_name)
  const [qty, setQty] = useState(r.item.total_quantity ?? '')
  const [cut, setCut] = useState(r.item.cut_style ?? '')

  useEffect(() => {
    setName(r.item.ingredient_name)
    setQty(r.item.total_quantity ?? '')
    setCut(r.item.cut_style ?? '')
  }, [r.item.id, r.item.ingredient_name, r.item.total_quantity, r.item.cut_style])

  const bg = ITEM_COLORS[hash(r.item.ingredient_name) % ITEM_COLORS.length]
  const initial = r.item.ingredient_name.replace(/[^A-Za-z]/g, '').charAt(0).toUpperCase() || '•'

  function saveEdit() {
    const patch: Partial<Pick<PrepItem, 'ingredient_name' | 'total_quantity' | 'cut_style'>> = {}
    if (name.trim() && name !== r.item.ingredient_name) patch.ingredient_name = name.trim()
    if (qty !== (r.item.total_quantity ?? '')) patch.total_quantity = qty || null
    if (cut !== (r.item.cut_style ?? '')) patch.cut_style = cut || null
    if (Object.keys(patch).length) r.onEdit(r.item.id, patch)
    setEditing(false)
  }

  return (
    <div className={'group grid grid-cols-[auto_auto_1fr_auto] items-center gap-4 border-b border-border/70 px-5 py-3 last:border-b-0 ' + (r.item.done ? 'bg-surface/40' : '')}>
      <DoneBox checked={r.item.done} disabled={!r.canEdit} onChange={(n) => r.onToggleDone(r.item.id, n)} />

      {r.item.image_url ? (
        <img src={r.item.image_url} alt="" className="h-10 w-10 shrink-0 rounded-md object-cover" />
      ) : (
        <div
          aria-hidden
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-sm font-medium text-ink/70"
          style={{ background: bg }}
        >
          {initial}
        </div>
      )}

      {editing ? (
        <div className="grid grid-cols-3 gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} className="rounded-md border border-border bg-card px-2 py-1 text-sm text-ink focus:border-ink focus:outline-none" />
          <input value={qty} onChange={(e) => setQty(e.target.value)} placeholder="quantity" className="rounded-md border border-border bg-card px-2 py-1 text-sm text-ink placeholder:text-muted-soft focus:border-ink focus:outline-none" />
          <input value={cut} onChange={(e) => setCut(e.target.value)} placeholder="cut / style" className="rounded-md border border-border bg-card px-2 py-1 text-sm text-ink placeholder:text-muted-soft focus:border-ink focus:outline-none" />
        </div>
      ) : (
        <div className={'min-w-0 ' + (r.item.done ? 'opacity-60 line-through' : '')}>
          <div className="truncate font-medium text-ink">{r.item.ingredient_name}</div>
          <div className="truncate text-xs text-muted">
            {r.item.total_quantity}
            {r.item.total_quantity && r.item.cut_style && ' · '}
            {r.item.cut_style}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition">
        {r.canEdit && (editing ? (
          <>
            <button onClick={saveEdit} className="text-xs font-medium text-accent hover:underline">Save</button>
            <button onClick={() => setEditing(false)} className="text-xs text-muted hover:text-ink">Cancel</button>
          </>
        ) : (
          <>
            {r.moveTargetId && r.moveTargetNumber !== null && (
              <button
                onClick={() => r.onMove(r.item.id, r.moveTargetId!)}
                className="text-xs text-muted hover:text-ink"
              >
                Move to {r.moveTargetNumber}
              </button>
            )}
            <button onClick={() => setEditing(true)} className="text-xs text-muted hover:text-ink">Edit</button>
            <button onClick={() => r.onRemove(r.item.id)} className="text-xs text-muted hover:text-accent">Remove</button>
          </>
        ))}
      </div>
    </div>
  )
}

function DoneBox({ checked, onChange, disabled }: { checked: boolean; onChange: (n: boolean) => void; disabled: boolean }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      aria-pressed={checked}
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

function AddItemRow({ onCancel, onAdd }: { onCancel: () => void; onAdd: (name: string, qty: string | null, cut: string | null) => void }) {
  const [name, setName] = useState('')
  const [qty, setQty] = useState('')
  const [cut, setCut] = useState('')

  function submit() {
    if (!name.trim()) return
    onAdd(name.trim(), qty.trim() || null, cut.trim() || null)
    setName(''); setQty(''); setCut('')
  }

  return (
    <div className="grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-3 border-b border-border bg-surface/40 px-5 py-3">
      <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ingredient" className="rounded-md border border-border bg-card px-2 py-1 text-sm text-ink placeholder:text-muted-soft focus:border-ink focus:outline-none" />
      <input value={qty} onChange={(e) => setQty(e.target.value)} placeholder="quantity (optional)" className="rounded-md border border-border bg-card px-2 py-1 text-sm text-ink placeholder:text-muted-soft focus:border-ink focus:outline-none" />
      <input value={cut} onChange={(e) => setCut(e.target.value)} placeholder="cut / style (optional)" className="rounded-md border border-border bg-card px-2 py-1 text-sm text-ink placeholder:text-muted-soft focus:border-ink focus:outline-none" />
      <div className="flex gap-2">
        <button onClick={submit} disabled={!name.trim()} className="rounded-full bg-ink px-3 py-1 text-xs font-medium text-surface disabled:opacity-40">Add</button>
        <button onClick={onCancel} className="text-xs text-muted hover:text-ink">Cancel</button>
      </div>
    </div>
  )
}
