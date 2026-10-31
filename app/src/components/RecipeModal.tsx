import { useEffect, useState } from 'react'
import { getRecipeById, type RecipeFull } from '../lib/data'

type Props = {
  recipeId: string | null
  onClose: () => void
}

export default function RecipeModal({ recipeId, onClose }: Props) {
  const [recipe, setRecipe] = useState<RecipeFull | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!recipeId) { setRecipe(null); return }
    setLoading(true)
    getRecipeById(recipeId)
      .then((r) => setRecipe(r))
      .finally(() => setLoading(false))
  }, [recipeId])

  useEffect(() => {
    if (!recipeId) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [recipeId, onClose])

  if (!recipeId) return null

  const methodSteps = (recipe?.method ?? '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)

  const portions = recipe?.tags?.find((t) => /portion|serving/i.test(t)) ?? null
  const metaBits = [recipe?.cuisine, portions].filter(Boolean) as string[]

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/60 p-4 md:p-10"
      onClick={onClose}
    >
      <div
        className="relative my-4 w-full max-w-4xl overflow-hidden rounded-2xl bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border-2 border-accent/60 bg-card text-ink hover:bg-surface"
        >
          ×
        </button>

        {loading && (
          <div className="p-10 text-center text-muted">Loading recipe…</div>
        )}

        {!loading && recipe && (
          <>
            <header className="bg-sage/50 p-6 md:p-8">
              <div className="flex flex-col gap-6 md:flex-row md:items-start">
                <div className="shrink-0">
                  {recipe.image_url ? (
                    <img
                      src={recipe.image_url}
                      alt=""
                      className="h-40 w-40 rounded-lg object-cover md:h-48 md:w-48"
                    />
                  ) : (
                    <div className="flex h-40 w-40 items-center justify-center rounded-lg bg-sage text-5xl font-display text-ink/40 md:h-48 md:w-48">
                      {recipe.name.charAt(0)}
                    </div>
                  )}
                  <p className="mt-2 text-xs italic text-muted">Illustrative serving image</p>
                </div>

                <div className="min-w-0 flex-1">
                  {metaBits.length > 0 && (
                    <p className="meta mb-2 text-muted" style={{ letterSpacing: '0.14em' }}>
                      {metaBits.join(' · ').toUpperCase()}
                    </p>
                  )}
                  <h2 className="font-display text-3xl font-normal text-ink md:text-4xl">{recipe.name}</h2>
                  {recipe.description && (
                    <p className="mt-2 text-ink-soft">{recipe.description}</p>
                  )}

                  <div className="mt-4 flex items-center gap-3">
                    <button
                      aria-label={recipe.is_favorite ? 'Unfavorite' : 'Favorite'}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card hover:border-ink"
                    >
                      <span className={recipe.is_favorite ? 'text-accent' : 'text-ink/40'}>
                        {recipe.is_favorite ? '♥' : '♡'}
                      </span>
                    </button>
                    {recipe.favorite_reason && (
                      <p className="text-sm text-ink-soft italic">{recipe.favorite_reason}</p>
                    )}
                  </div>
                </div>
              </div>
            </header>

            <div className="p-6 md:p-8">
              {recipe.adaptations && (
                <div className="mb-6 rounded-md bg-[#f0e4ca] p-4">
                  <p className="font-semibold text-ink">Dashboard adaptation</p>
                  <p className="mt-1 text-ink-soft">{recipe.adaptations}</p>
                </div>
              )}

              <div className="grid gap-8 md:grid-cols-2">
                <div>
                  <p className="meta mb-3 text-muted" style={{ letterSpacing: '0.14em' }}>
                    INGREDIENTS{portions ? ` · ${portions}` : ''}
                  </p>
                  {recipe.ingredients.length === 0 ? (
                    <p className="text-muted italic">No ingredients listed yet.</p>
                  ) : (
                    <ul className="space-y-2 text-ink-soft">
                      {recipe.ingredients.map((ing, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-muted">•</span>
                          <span>{ing}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <p className="meta mb-3 text-muted" style={{ letterSpacing: '0.14em' }}>
                    METHOD
                  </p>
                  {methodSteps.length === 0 ? (
                    <p className="text-muted italic">No method listed yet.</p>
                  ) : (
                    <ol className="space-y-3 text-ink-soft">
                      {methodSteps.map((step, i) => (
                        <li key={i} className="flex gap-3">
                          <span className="font-medium text-ink">{i + 1}.</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              </div>

              {(recipe.source_chef || recipe.source_link) && (
                <>
                  <hr className="my-6 border-border" />
                  <p className="text-sm text-ink-soft">
                    Original inspiration:{' '}
                    {recipe.source_link ? (
                      <a
                        href={recipe.source_link}
                        target="_blank"
                        rel="noreferrer"
                        className="underline hover:text-ink"
                      >
                        {recipe.source_chef ?? 'source'} ↗
                      </a>
                    ) : (
                      <span>{recipe.source_chef}</span>
                    )}
                    . The ingredients and steps here are the household adaptation, not the original recipe;
                    the source author has not reviewed these changes.
                  </p>
                </>
              )}

              {recipe.sesame_safe && (
                <p className="mt-4 text-sm text-muted">
                  Use sesame-free ingredients and check packaged-food cross-contact guidance.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
