import type { Session } from '@supabase/supabase-js'
import Logo from './Logo'
import { supabase } from '../supabase'

type Props = { session: Session | null; subtitle?: string }

export default function Header({ session, subtitle }: Props) {
  return (
    <header className="border-b border-border bg-bg">
      <div className="mx-auto flex max-w-7xl items-start justify-between px-6 py-6 md:px-10 md:py-8">
        <div className="flex items-center gap-4">
          <Logo />
          <div>
            <div className="meta text-ink-soft" style={{ letterSpacing: '0.18em' }}>
              The Week's Table
            </div>
            {subtitle && (
              <div className="meta mt-1 text-muted" style={{ letterSpacing: '0.14em' }}>
                {subtitle}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-5 text-sm text-muted">
          {session ? (
            <>
              <span className="hidden items-center gap-2 md:inline-flex">
                <span className="h-2 w-2 rounded-full bg-ink/70" />
                Signed in
              </span>
              <button
                onClick={() => supabase.auth.signOut()}
                className="underline underline-offset-4 hover:text-ink"
              >
                Sign out
              </button>
            </>
          ) : (
            <span className="hidden items-center gap-2 md:inline-flex">
              <span className="h-2 w-2 rounded-full bg-muted-soft" />
              Read-only
            </span>
          )}
        </div>
      </div>
    </header>
  )
}
