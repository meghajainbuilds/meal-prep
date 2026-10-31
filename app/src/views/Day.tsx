import { useOutletContext } from 'react-router-dom'
import type { AppContext } from '../App'
import { weekDates, dayShort, dayNumber } from '../lib/data'

export default function Day() {
  const { activeWeek } = useOutletContext<AppContext>()
  const dates = activeWeek ? weekDates(activeWeek.week_start) : []
  const today = new Date().toISOString().slice(0, 10)
  const activeDate = dates.find((d) => d >= today) ?? dates[dates.length - 1]

  return (
    <div className="space-y-8">
      <section>
        <div className="eyebrow mb-3">Day view</div>
        <h2 className="text-4xl font-normal text-ink">
          {activeDate ? new Date(activeDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
        </h2>
      </section>

      {dates.length > 0 && (
        <div className="grid grid-cols-7 gap-2">
          {dates.map((d) => {
            const isActive = d === activeDate
            return (
              <div
                key={d}
                className={
                  'rounded-md border px-3 py-3 text-center ' +
                  (isActive
                    ? 'border-ink bg-ink text-surface'
                    : 'border-border bg-card text-ink hover:border-muted-soft')
                }
              >
                <div className="text-xs font-medium">{dayShort(d)}</div>
                <div className="mt-1 text-xl font-display">{String(dayNumber(d)).padStart(2, '0')}</div>
              </div>
            )
          })}
        </div>
      )}

      <ComingSoon label="Day timeline" />
    </div>
  )
}

function ComingSoon({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-surface/50 p-10 text-center">
      <h3 className="text-xl font-medium text-ink">{label} — next.</h3>
      <p className="mt-2 text-sm text-muted">
        Timeline with breakfast / fruit + nuts / lunch / dinner / evening, My plate portions,
        ate-it checkboxes. Lands next session.
      </p>
    </div>
  )
}
