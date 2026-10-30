import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const jobName = process.argv[2]

if (!jobName) {
  console.error('Usage: node run.mjs <job-name>')
  process.exit(2)
}

const start = Date.now()
const stamp = new Date().toISOString()
console.log(`[${stamp}] START ${jobName}`)

try {
  const mod = await import(join(here, 'jobs', `${jobName}.mjs`))
  const result = await mod.default()
  console.log(`[${new Date().toISOString()}] OK ${jobName} (${Date.now() - start}ms)`, result ?? '')
  process.exit(0)
} catch (err) {
  console.error(`[${new Date().toISOString()}] FAIL ${jobName}:`, err?.stack ?? err)
  process.exit(1)
}
