import Anthropic from '@anthropic-ai/sdk'
import { env } from './env.mjs'

const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })

export async function ask(prompt, opts = {}) {
  const message = await client.messages.create({
    model: opts.model ?? env.AI_MODEL,
    max_tokens: opts.max_tokens ?? 1024,
    system: opts.system,
    messages: [{ role: 'user', content: prompt }],
  })
  return message.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
}
