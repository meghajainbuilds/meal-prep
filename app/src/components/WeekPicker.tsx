import { useSearchParams } from 'react-router-dom'
import { monthShort, dayNumber, type Week, type WeekWithCount } from '../lib/data'

type Props = {
  activeWeek: Week | null
  allWeeks: WeekWithCount[]
}

function label(w: WeekWithCount) {
  return `Week of ${monthShort(w.week_start)} ${dayNumber(w.week_start)}${w.version > 1 ? ` · v${w.version}` : ''}`
}

export default function WeekPicker({ activeWeek, allWeeks }: Props) {
  const [params, setParams] = useSearchParams()

  if (allWeeks.length === 0) return null

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = new URLSearchParams(params)
    next.set('week', e.target.value)
    // Jumping to a different week shouldn't keep the old ?date=, which
    // belongs to the previous week.
    next.delete('date')
    setParams(next, { replace: false })
  }

  return (
    <label className="flex items-center gap-2 text-sm text-muted">
      <span className="eyebrow" style={{ letterSpacing: '0.14em' }}>Viewing</span>
      <select
        value={activeWeek?.id ?? ''}
        onChange={onChange}
        className="rounded-md border border-border bg-card px-3 py-1.5 font-medium text-ink shadow-sm focus:border-ink focus:outline-none"
      >
        {allWeeks.map((w) => (
          <option key={w.id} value={w.id}>
            {label(w)}
          </option>
        ))}
      </select>
    </label>
  )
}
