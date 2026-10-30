import { createClient } from '@supabase/supabase-js'
import { env } from './env.mjs'

export const db = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})
