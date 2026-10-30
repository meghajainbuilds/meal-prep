import { db } from '../db.mjs'
import { ask } from '../claude.mjs'

export default async function heartbeat() {
  const { data: weeks, error } = await db
    .from('weeks')
    .select('id, week_start, version')
    .order('week_start', { ascending: false })
    .limit(3)
  if (error) throw error

  const reply = await ask('Say ok', { max_tokens: 16 })

  return {
    weeks_found: weeks.length,
    recent_weeks: weeks.map((w) => `${w.week_start} v${w.version}`),
    claude_reply: reply,
  }
}
