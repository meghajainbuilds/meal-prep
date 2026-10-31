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
  const b64 = json?.data?.[0]?.b64_json
  if (!b64) throw new Error('OpenAI returned no b64_json')
  return Buffer.from(b64, 'base64')
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

async function processBatch(label, table, kind, rows, promptFn, limit) {
  let done = 0
  let failed = 0
  const slice = rows.slice(0, limit)
  for (const row of slice) {
    try {
      const bytes = await generateOnce(promptFn(row))
      const url = await uploadAndSetUrl(table, row.id, kind, bytes)
      console.log(`  ✓ ${label}: ${row.name ?? row.ingredient_name} → ${url}`)
      done++
    } catch (e) {
      console.error(`  ✗ ${label}: ${row.name ?? row.ingredient_name}:`, e.message ?? e)
      failed++
    }
  }
  return { done, failed, skipped: rows.length - slice.length }
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

  const nullFilter = regenAll ? '' : 'is.null'

  const results = {}

  if (!only || only === 'recipes') {
    const q = db.from('recipes').select('id, name, description')
    const { data } = regenAll ? await q : await q.is('image_url', null)
    console.log(`Recipes without image_url: ${data?.length ?? 0}`)
    results.recipes = await processBatch('recipe', 'recipes', 'recipes', data ?? [], recipePrompt, limit)
  }
  if (!only || only === 'shopping') {
    const q = db.from('shopping_items').select('id, name')
    const { data } = regenAll ? await q : await q.is('image_url', null)
    console.log(`Shopping items without image_url: ${data?.length ?? 0}`)
    results.shopping = await processBatch('shopping', 'shopping_items', 'shopping', data ?? [], shoppingPrompt, limit)
  }
  if (!only || only === 'prep') {
    const q = db.from('prep_items').select('id, ingredient_name, action, cut_style')
    const { data } = regenAll ? await q : await q.is('image_url', null)
    console.log(`Prep items without image_url: ${data?.length ?? 0}`)
    results.prep = await processBatch('prep', 'prep_items', 'prep', data ?? [], prepPrompt, limit)
  }

  return results
}
