import { useEffect, useMemo, useState } from 'react'
import { Outlet, useSearchParams } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import Header from './components/Header'
import Nav from './components/Nav'
import Intro from './components/Intro'
import { getAllWeeksWithItems, dayNumber, monthShort } from './lib/data'
import type { Week as WeekT, WeekWithCount } from './lib/data'

const OWNER_EMAIL = 'meghajain@outlook.com'

export type AppContext = {
  session: Session | null
  activeWeek: WeekT | null
  allWeeks: WeekWithCount[]
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [allWeeks, setAllWeeks] = useState<WeekWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [searchParams] = useSearchParams()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    getAllWeeksWithItems().then((ws) => { setAllWeeks(ws); setLoading(false) })
    return () => sub.subscription.unsubscribe()
  }, [])

  const weekParam = searchParams.get('week')
  const activeWeek: WeekT | null = useMemo(() => {
    if (allWeeks.length === 0) return null
    if (weekParam) {
      const picked = allWeeks.find((w) => w.id === weekParam)
      if (picked) return picked
    }
    const today = new Date().toISOString().slice(0, 10)
    return allWeeks.find((w) => w.week_start <= today) ?? allWeeks[0]
  }, [weekParam, allWeeks])

  const subtitle = activeWeek
    ? `Week of ${monthShort(activeWeek.week_start)} ${dayNumber(activeWeek.week_start)} · v${activeWeek.version}`
    : undefined

  const isVisitor = !!session?.user?.email && session.user.email !== OWNER_EMAIL

  return (
    <div className="min-h-screen bg-bg">
      <Header session={session} subtitle={subtitle} />
      {isVisitor && (
        <div className="border-y-2 border-accent bg-accent text-surface shadow-sm">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-3 md:px-10">
            <p className="text-sm font-medium">
              <span className="mr-2 rounded bg-surface/20 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider">
                Read only
              </span>
              You're viewing Megha's meal plan. Want your own copy?
            </p>
            <a
              href="https://github.com/meghajainbuilds/meal-prep"
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-surface px-4 py-1.5 text-sm font-semibold text-accent hover:bg-surface/90"
            >
              Fork the repo →
            </a>
          </div>
        </div>
      )}
      <Intro />
      <Nav />
      <main className="mx-auto max-w-7xl px-6 py-10 md:px-10 md:py-14">
        {loading ? (
          <p className="text-muted">Loading…</p>
        ) : (
          <Outlet context={{ session, activeWeek, allWeeks } satisfies AppContext} />
        )}
      </main>
      <footer className="border-t border-border bg-bg py-8">
        <div className="mx-auto max-w-7xl px-6 text-xs leading-relaxed text-muted md:px-10">
          Planned meals, recipes, ingredients and prep are shared read-only.
          Actual eating logs and full exports stay private.
        </div>
      </footer>
    </div>
  )
}
