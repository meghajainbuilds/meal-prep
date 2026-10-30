import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

const OWNER_EMAIL = 'meghajain@outlook.com'

type Week = {
  id: string
  week_start: string
  version: number
  notes: string | null
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [weeks, setWeeks] = useState<Week[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    supabase
      .from('weeks')
      .select('id, week_start, version, notes')
      .order('week_start', { ascending: false })
      .limit(5)
      .then(({ data }) => setWeeks(data ?? []))
  }, [session])

  if (loading) return <Shell><p className="text-stone-500">Loading…</p></Shell>

  return (
    <Shell>
      <header className="mb-10">
        <h1 className="text-4xl font-semibold tracking-tight text-stone-900">meal prep</h1>
        <p className="mt-2 text-stone-600">
          Weekly plans, ingredients, prep sessions, recipes.
        </p>
      </header>

      <section className="mb-10">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
          Recent weeks (public)
        </h2>
        {weeks.length === 0 ? (
          <p className="text-stone-500">No weeks yet. Sign in to create one.</p>
        ) : (
          <ul className="space-y-2">
            {weeks.map((w) => (
              <li key={w.id} className="rounded-lg border border-stone-200 bg-white p-4">
                <div className="font-medium text-stone-900">Week of {w.week_start}</div>
                <div className="text-sm text-stone-500">v{w.version}</div>
                {w.notes && <div className="mt-1 text-sm text-stone-600">{w.notes}</div>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {session ? <OwnerPanel session={session} /> : <SignIn />}
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">{children}</div>
  )
}

function SignIn() {
  const [email, setEmail] = useState(OWNER_EMAIL)
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function send(e: React.FormEvent) {
    e.preventDefault()
    setStatus('sending')
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })
    if (error) {
      setStatus('error')
      setError(error.message)
    } else {
      setStatus('sent')
    }
  }

  return (
    <section className="rounded-xl border border-stone-200 bg-white p-6">
      <h2 className="mb-2 text-lg font-semibold text-stone-900">Owner sign-in</h2>
      <p className="mb-4 text-sm text-stone-600">
        A sign-in link will be emailed to you.
      </p>
      <form onSubmit={send} className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="flex-1 rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={status === 'sending' || status === 'sent'}
          className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50"
        >
          {status === 'sent' ? 'Sent — check email' : status === 'sending' ? 'Sending…' : 'Send link'}
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </section>
  )
}

function OwnerPanel({ session }: { session: Session }) {
  const [msg, setMsg] = useState<string | null>(null)

  async function addPlaceholderWeek() {
    const today = new Date()
    const dow = today.getDay()
    const monday = new Date(today)
    monday.setDate(today.getDate() - ((dow + 6) % 7))
    const weekStart = monday.toISOString().slice(0, 10)
    const { error } = await supabase
      .from('weeks')
      .insert({ week_start: weekStart, version: 1, notes: 'Created from the app' })
    setMsg(error ? `Error: ${error.message}` : `Added week ${weekStart}`)
  }

  return (
    <section className="rounded-xl border border-stone-200 bg-white p-6">
      <h2 className="mb-2 text-lg font-semibold text-stone-900">
        Signed in as {session.user.email}
      </h2>
      <p className="mb-4 text-sm text-stone-600">
        Write access confirmed via RLS. The real planner UI replaces this panel next.
      </p>
      <div className="flex gap-3">
        <button
          onClick={addPlaceholderWeek}
          className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800"
        >
          Add this week (placeholder)
        </button>
        <button
          onClick={() => supabase.auth.signOut()}
          className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100"
        >
          Sign out
        </button>
      </div>
      {msg && <p className="mt-3 text-sm text-stone-600">{msg}</p>}
    </section>
  )
}
