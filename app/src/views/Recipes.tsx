import { useEffect, useState } from 'react'
import RecipeModal from '../components/RecipeModal'
import { getAllRecipes, type Recipe } from '../lib/data'

export default function Recipes() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [openRecipe, setOpenRecipe] = useState<string | null>(null)

  useEffect(() => {
    getAllRecipes().then((data) => { setRecipes(data); setLoading(false) })
  }, [])

  // Plate components (plain rice, roti, yogurt, seed mix, simple lunch veg)
  // stay available for menus but shouldn't clutter the Recipes grid, per
  // the owner's requirements doc section 5.
  const visible = recipes.filter((r) => !r.is_plate_component)

  return (
    <div className="space-y-8">
      <section>
        <div className="eyebrow mb-3">Evergreen recipes</div>
        <h2 className="text-4xl font-normal text-ink">Recipe library.</h2>
        <p className="mt-2 text-sm text-muted">Saved independently of any week. Click a card for the recipe.</p>
      </section>

      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : visible.length === 0 ? (
        <p className="text-muted">No recipes yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setOpenRecipe(r.id)}
              className="group overflow-hidden rounded-xl border border-border bg-card text-left transition hover:border-ink hover:shadow-sm"
            >
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

      <RecipeModal recipeId={openRecipe} onClose={() => setOpenRecipe(null)} />
    </div>
  )
}
