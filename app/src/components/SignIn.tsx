import { useState } from 'react'
import { supabase } from '../supabase'

const OWNER_EMAIL = 'meghajain@outlook.com'

export default function SignIn() {
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
    if (error) { setStatus('error'); setError(error.message) } else setStatus('sent')
  }

  return (
    <section className="mx-auto max-w-xl rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="eyebrow mb-2">Owner sign-in</div>
      <h2 className="mb-4 text-2xl font-medium text-ink">Edit your plan.</h2>
      <p className="mb-5 text-sm text-muted">A sign-in link will be emailed to you.</p>
      <form onSubmit={send} className="flex flex-col gap-3 sm:flex-row">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="flex-1 rounded-md border border-border bg-card px-3 py-2.5 text-sm text-ink focus:border-ink focus:outline-none"
        />
        <button
          type="submit"
          disabled={status === 'sending' || status === 'sent'}
          className="rounded-md bg-ink px-4 py-2.5 text-sm font-medium text-surface hover:bg-ink-soft disabled:opacity-50"
        >
          {status === 'sent' ? 'Sent — check email' : status === 'sending' ? 'Sending…' : 'Send link'}
        </button>
      </form>
      {error && <p className="mt-3 text-sm text-accent">{error}</p>}
    </section>
  )
}
