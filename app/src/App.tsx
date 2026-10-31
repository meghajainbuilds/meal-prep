import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import Header from './components/Header'
import Nav from './components/Nav'
import Intro from './components/Intro'
import { getLatestWeek, dayNumber, monthShort } from './lib/data'
import type { Week as WeekT } from './lib/data'

const OWNER_EMAIL = 'meghajain@outlook.com'

export type AppContext = {
  session: Session | null
  activeWeek: WeekT | null
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [activeWeek, setActiveWeek] = useState<WeekT | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    getLatestWeek().then((w) => { setActiveWeek(w); setLoading(false) })
    return () => sub.subscription.unsubscribe()
  }, [])

  const subtitle = activeWeek
    ? `Week of ${monthShort(activeWeek.week_start)} ${dayNumber(activeWeek.week_start)} · v${activeWeek.version}`
    : undefined

  const isVisitor = !!session?.user?.email && session.user.email !== OWNER_EMAIL

  return (
    <div className="min-h-screen bg-bg">
      <Header session={session} subtitle={subtitle} />
      {isVisitor && (
        <div className="border-b border-border bg-sage/40">
          <div className="mx-auto max-w-7xl px-6 py-3 md:px-10">
            <p className="text-sm text-ink">
              You're viewing Megha's meal plan, read-only. Want to build your own?{' '}
              <a
                href="https://github.com/meghajainbuilds/meal-prep"
                target="_blank"
                rel="noreferrer"
                className="font-medium underline"
              >
                Fork the repo
              </a>{' '}
              and run your own copy.
            </p>
          </div>
        </div>
      )}
      <Intro />
      <Nav />
      <main className="mx-auto max-w-7xl px-6 py-10 md:px-10 md:py-14">
        {loading ? (
          <p className="text-muted">Loading…</p>
        ) : (
          <Outlet context={{ session, activeWeek } satisfies AppContext} />
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
