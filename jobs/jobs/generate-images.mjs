import { db } from '../db.mjs'
import { env } from '../env.mjs'

const BUCKET = 'food-images'

const STYLE_SUFFIX = 'Overhead photograph on a plain cream linen surface in soft natural daylight. Shallow depth of field. Warm, minimalist cookbook style. Centered single subject. No text, no utensils, no hands, no packaging, no logos, no plates stacked.'

function recipePrompt(r) {
  const desc = r.description ? ` ${r.description}` : ''
  return `A beautifully plated single-portion serving of ${r.name}.${desc} ${STYLE_SUFFIX}`
}
function shoppingPrompt(s) {
  return `Raw ${s.name}, grocery-ready, uncooked and unprepared. ${STYLE_SUFFIX}`
}
function prepPrompt(p) {
  const action = p.action === 'chop' ? 'chopped and prepped' : p.action === 'roast' ? 'roasted' : 'cooked'
  const cut = p.cut_style ? ` (${p.cut_style})` : ''
  return `${action} ${p.ingredient_name}${cut}, shown in a small ceramic prep bowl. ${STYLE_SUFFIX}`
}

const norm = (s) => (s ?? '').trim().toLowerCase()
const recipeKey = (r) => norm(r.name)
const shoppingKey = (s) => norm(s.name)
const prepKey = (p) => `${norm(p.ingredient_name)}|${p.action}|${norm(p.cut_style)}`

async function generateOnce(prompt) {
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: env.IMAGE_MODEL,
      prompt,
      size: env.IMAGE_SIZE,
      quality: env.IMAGE_QUALITY,
      n: 1,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`OpenAI ${res.status}: ${text.slice(0, 300)}`)
  }
  const json = await res.json()
  const item = json?.data?.[0]
  if (item?.b64_json) return Buffer.from(item.b64_json, 'base64')
  if (item?.url) {
    const imgRes = await fetch(item.url)
    if (!imgRes.ok) throw new Error(`Fetch image URL failed: ${imgRes.status}`)
    return Buffer.from(await imgRes.arrayBuffer())
  }
  throw new Error('OpenAI returned no b64_json or url')
}

async function uploadAndSetUrl(table, id, kind, bytes) {
  const path = `${kind}/${id}.png`
  const { error: upErr } = await db.storage.from(BUCKET).upload(path, bytes, {
    contentType: 'image/png',
    upsert: true,
  })
  if (upErr) throw upErr
  const { data } = db.storage.from(BUCKET).getPublicUrl(path)
  const url = data.publicUrl
  const { error: updErr } = await db.from(table).update({ image_url: url }).eq('id', id)
  if (updErr) throw updErr
  return url
}

// Build a {dedupe-key → existing image_url} map from rows in `table` that
// already have an image_url. Future rows with the same key reuse the URL
// instead of generating a new image.
async function buildReuseMap(table, selectCols, keyFn) {
  const { data } = await db.from(table).select(selectCols).not('image_url', 'is', null)
  const map = new Map()
  for (const row of data ?? []) {
    const key = keyFn(row)
    if (key && !map.has(key)) map.set(key, row.image_url)
  }
  return map
}

async function processBatch(label, table, kind, rows, promptFn, keyFn, reuseMap, limit) {
  let generated = 0
  let reused = 0
  let failed = 0
  const slice = rows.slice(0, limit)
  for (const row of slice) {
    const name = row.name ?? row.ingredient_name
    try {
      const key = keyFn ? keyFn(row) : null
      if (key && reuseMap.has(key)) {
        const existingUrl = reuseMap.get(key)
        const { error } = await db.from(table).update({ image_url: existingUrl }).eq('id', row.id)
        if (error) throw error
        console.log(`  ↻ ${label}: ${name} → reused ${existingUrl}`)
        reused++
        continue
      }
      const bytes = await generateOnce(promptFn(row))
      const url = await uploadAndSetUrl(table, row.id, kind, bytes)
      console.log(`  ✓ ${label}: ${name} → ${url}`)
      if (key) reuseMap.set(key, url)
      generated++
    } catch (e) {
      console.error(`  ✗ ${label}: ${name}:`, e.message ?? e)
      failed++
    }
  }
  return { generated, reused, failed, skipped: rows.length - slice.length }
}

export default async function main() {
  if (!env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY missing from .env')

  // Parse CLI flags: --limit N --only recipes|shopping|prep --all (regenerate all)
  const argv = process.argv.slice(3)
  const flag = (name) => {
    const i = argv.indexOf(name)
    return i === -1 ? null : argv[i + 1]
  }
  const limit = parseInt(flag('--limit') ?? '5', 10)
  const only = flag('--only')
  const regenAll = argv.includes('--all')

  console.log(`Image gen: model=${env.IMAGE_MODEL} quality=${env.IMAGE_QUALITY} size=${env.IMAGE_SIZE} limit=${limit}${only ? ` only=${only}` : ''}${regenAll ? ' (regenerating ALL, not just null image_url)' : ''}`)

  const results = {}

  if (!only || only === 'recipes') {
    const reuseMap = await buildReuseMap('recipes', 'name, image_url', recipeKey)
    const q = db.from('recipes').select('id, name, description')
    const { data } = regenAll ? await q : await q.is('image_url', null)
    console.log(`Recipes to process: ${data?.length ?? 0} (reuse pool: ${reuseMap.size})`)
    results.recipes = await processBatch('recipe', 'recipes', 'recipes', data ?? [], recipePrompt, recipeKey, reuseMap, limit)
  }
  if (!only || only === 'shopping') {
    const reuseMap = await buildReuseMap('shopping_items', 'name, image_url', shoppingKey)
    const q = db.from('shopping_items').select('id, name')
    const { data } = regenAll ? await q : await q.is('image_url', null)
    console.log(`Shopping items to process: ${data?.length ?? 0} (reuse pool: ${reuseMap.size})`)
    results.shopping = await processBatch('shopping', 'shopping_items', 'shopping', data ?? [], shoppingPrompt, shoppingKey, reuseMap, limit)
  }
  if (!only || only === 'prep') {
    const reuseMap = await buildReuseMap('prep_items', 'ingredient_name, action, cut_style, image_url', prepKey)
    const q = db.from('prep_items').select('id, ingredient_name, action, cut_style')
    const { data } = regenAll ? await q : await q.is('image_url', null)
    console.log(`Prep items to process: ${data?.length ?? 0} (reuse pool: ${reuseMap.size})`)
    results.prep = await processBatch('prep', 'prep_items', 'prep', data ?? [], prepPrompt, prepKey, reuseMap, limit)
  }

  return results
}
