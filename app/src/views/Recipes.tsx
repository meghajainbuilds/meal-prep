import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import type { AppContext } from '../App'
import RecipeModal from '../components/RecipeModal'
import { getAllRecipes, type Recipe } from '../lib/data'

const ALL = '__all__'
const FAVES = '__faves__'

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase())
}

export default function Recipes() {
  const { canEdit } = useOutletContext<AppContext>()
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [openRecipe, setOpenRecipe] = useState<string | null>(null)
  const [tab, setTab] = useState<string>(ALL)
  const [query, setQuery] = useState('')

  useEffect(() => {
    getAllRecipes().then((data) => { setRecipes(data); setLoading(false) })
  }, [])

  // Plate components (plain rice, roti, yogurt, seed mix, simple lunch veg)
  // stay available for menus but shouldn't clutter the Recipes grid, per
  // the owner's requirements doc section 5.
  const visible = useMemo(() => recipes.filter((r) => !r.is_plate_component), [recipes])

  // Dynamic tabs: All, Favorites (only if any exist), then every unique
  // first-tag in visible recipes alphabetically. Each shows a count so
  // empty categories tell the owner at a glance.
  const tabs = useMemo(() => {
    const faveCount = visible.filter((r) => r.is_favorite).length
    const tagCounts = new Map<string, number>()
    for (const r of visible) {
      const t = r.tags?.[0]?.trim()
      if (!t) continue
      tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1)
    }
    const tagTabs = [...tagCounts.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, count]) => ({ key, label: titleCase(key), count }))
    return [
      { key: ALL, label: 'All', count: visible.length },
      ...(faveCount > 0 ? [{ key: FAVES, label: 'Favorites', count: faveCount }] : []),
      ...tagTabs,
    ]
  }, [visible])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return visible.filter((r) => {
      if (tab === FAVES && !r.is_favorite) return false
      if (tab !== ALL && tab !== FAVES && r.tags?.[0] !== tab) return false
      if (q) {
        const hay = `${r.name} ${r.description ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [visible, tab, query])

  return (
    <div className="space-y-8">
      <section>
        <div className="eyebrow mb-3">Evergreen recipes</div>
        <h2 className="text-4xl font-normal text-ink">Recipe library.</h2>
        <p className="mt-2 text-sm text-muted">Saved independently of any week. Click a card for the recipe.</p>
      </section>

      {!loading && (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={
                  'rounded-full px-4 py-1.5 text-sm font-medium transition ' +
                  (tab === t.key
                    ? 'bg-ink text-surface'
                    : 'border border-border bg-card text-ink hover:border-ink')
                }
              >
                {t.label}
                <span className={'ml-1.5 text-xs ' + (tab === t.key ? 'text-surface/70' : 'text-muted')}>
                  {t.count}
                </span>
              </button>
            ))}
          </div>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search recipes…"
            className="w-full max-w-xs rounded-full border border-border bg-card px-4 py-1.5 text-sm text-ink placeholder:text-muted-soft focus:border-ink focus:outline-none"
          />
        </div>
      )}

      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted italic">
          {query || tab !== ALL
            ? 'No recipes match that filter.'
            : 'No recipes yet.'}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setOpenRecipe(r.id)}
              className="group relative overflow-hidden rounded-xl border border-border bg-card text-left transition hover:border-ink hover:shadow-sm"
            >
              {r.is_favorite && (
                <span
                  className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-card/90 text-accent shadow-sm"
                  aria-label="Favorite"
                >
                  ♥
                </span>
              )}
              {r.image_url ? (
                <img src={r.image_url} alt="" className="h-48 w-full object-cover" />
              ) : (
                <div className="flex h-48 items-center justify-center bg-sage/60 text-5xl font-display text-ink/40">
                  {r.name.charAt(0)}
                </div>
              )}
              <div className="p-5">
                {r.tags?.[0] && (
                  <div className="meta mb-2 flex items-center gap-2 text-muted">
                    <span className="h-1.5 w-1.5 rounded-full bg-sage-strong" /> {r.tags[0]}
                  </div>
                )}
                <h3 className="text-xl font-medium text-ink">{r.name}</h3>
                {r.description && <p className="mt-1 text-sm text-muted">{r.description}</p>}
              </div>
            </button>
          ))}
        </div>
      )}

      <RecipeModal recipeId={openRecipe} onClose={() => setOpenRecipe(null)} canEdit={canEdit} />
    </div>
  )
}
