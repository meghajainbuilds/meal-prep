type Props = {
  date: string                                // ISO yyyy-mm-dd
  onChange: (nextIso: string) => void
  stepDays: number                            // 1 for Day view, 7 for week-scoped views
  label?: string                              // defaults to "Date"
}

function shiftIso(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export default function DatePicker({ date, onChange, stepDays, label = 'Date' }: Props) {
  return (
    <div className="inline-flex flex-col gap-2">
      <span className="text-sm font-semibold text-ink">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={date}
          onChange={(e) => { if (e.target.value) onChange(e.target.value) }}
          className="rounded-md border border-border bg-card px-3 py-2 text-sm text-ink shadow-sm focus:border-ink focus:outline-none"
        />
        <button
          type="button"
          onClick={() => onChange(shiftIso(date, -stepDays))}
          aria-label={stepDays === 1 ? 'Previous day' : 'Previous week'}
          className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-ink shadow-sm hover:border-ink"
        >
          ←
        </button>
        <button
          type="button"
          onClick={() => onChange(shiftIso(date, stepDays))}
          aria-label={stepDays === 1 ? 'Next day' : 'Next week'}
          className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-ink shadow-sm hover:border-ink"
        >
          →
        </button>
      </div>
    </div>
  )
}
