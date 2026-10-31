import { NavLink } from 'react-router-dom'

const TABS = [
  { to: '/week', label: 'Week' },
  { to: '/day', label: 'Day' },
  { to: '/ingredients', label: 'Ingredients' },
  { to: '/prep', label: 'Prep' },
  { to: '/recipes', label: 'Recipes' },
]

export default function Nav() {
  return (
    <nav className="border-b border-border">
      <div className="mx-auto flex max-w-7xl items-center gap-8 px-6 md:px-10">
        {TABS.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.to === '/week'}>
            {({ isActive }) => (
              <span className="relative inline-block py-5 text-base">
                {isActive && (
                  <span
                    className="absolute left-1/2 top-0 h-3 w-[2px] -translate-x-1/2 bg-accent"
                    aria-hidden
                  />
                )}
                <span
                  className={
                    isActive
                      ? 'font-semibold text-ink'
                      : 'text-muted hover:text-ink'
                  }
                >
                  {t.label}
                </span>
                {isActive && (
                  <span
                    className="absolute inset-x-0 -bottom-px h-[2px] bg-ink"
                    aria-hidden
                  />
                )}
              </span>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
