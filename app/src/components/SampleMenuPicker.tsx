import { useState } from 'react'
import { SAMPLE_MENUS } from '../lib/data'

type Props = {
  open: boolean
  onClose: () => void
  onApply: (menuKey: string) => Promise<void> | void
}

export default function SampleMenuPicker({ open, onClose, onApply }: Props) {
  const [applying, setApplying] = useState<string | null>(null)

  if (!open) return null

  async function pick(key: string) {
    if (applying) return
    const ok = window.confirm('This will replace all dishes planned for this day. Continue?')
    if (!ok) return
    setApplying(key)
    try {
      await onApply(key)
      onClose()
    } finally {
      setApplying(null)
    }
  }

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
          <h3 className="font-display text-2xl text-ink">Apply a sample menu</h3>
          <button onClick={onClose} className="text-muted hover:text-ink" aria-label="Close">×</button>
        </div>
        <p className="mt-2 text-sm text-muted">
          Picks one template and rewrites this day. Won't touch other days or your ate-it log.
        </p>

        <ul className="mt-5 space-y-3">
          {SAMPLE_MENUS.map((menu) => (
            <li key={menu.key}>
              <button
                onClick={() => pick(menu.key)}
                disabled={!!applying}
                className="w-full rounded-xl border border-border bg-surface/50 p-4 text-left transition hover:border-ink disabled:opacity-50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-display text-lg text-ink">{menu.label}</div>
                    <div className="mt-1 text-sm text-muted">{menu.byline}</div>
                  </div>
                  <span className="shrink-0 rounded-full border border-border px-2 py-1 text-xs text-muted">
                    {menu.items.length} dishes
                  </span>
                </div>
                <div className="mt-3 text-xs text-muted-soft">
                  {menu.items.map((i) => i.recipe_name).join(' · ')}
                </div>
                {applying === menu.key && (
                  <div className="mt-2 text-xs text-accent">Applying…</div>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
