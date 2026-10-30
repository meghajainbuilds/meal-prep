import 'dotenv/config'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { config as loadEnv } from 'dotenv'

const here = dirname(fileURLToPath(import.meta.url))
loadEnv({ path: join(here, '..', '.env') })

function need(name) {
  const v = process.env[name]
  if (!v) throw new Error(`Missing ${name} in .env`)
  return v
}

export const env = {
  SUPABASE_URL: need('SUPABASE_URL'),
  SUPABASE_SERVICE_ROLE_KEY: need('SUPABASE_SERVICE_ROLE_KEY'),
  ANTHROPIC_API_KEY: need('ANTHROPIC_API_KEY'),
  AI_MODEL: process.env.AI_MODEL ?? 'claude-sonnet-5-5',
  TZ: process.env.TZ ?? 'America/Los_Angeles',
}
