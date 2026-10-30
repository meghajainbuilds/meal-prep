import Anthropic from '@anthropic-ai/sdk'

const DEFAULT_MODEL = process.env.AI_MODEL ?? 'claude-sonnet-5-5'

export default async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 500 })
  }

  let body: { prompt?: string; system?: string; model?: string; max_tokens?: number }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const prompt = body.prompt?.trim()
  if (!prompt) {
    return Response.json({ error: 'Missing prompt' }, { status: 400 })
  }

  const client = new Anthropic({ apiKey })
  const message = await client.messages.create({
    model: body.model ?? DEFAULT_MODEL,
    max_tokens: body.max_tokens ?? 1024,
    system: body.system,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')

  return Response.json({
    text,
    model: message.model,
    usage: message.usage,
  })
}

export const config = { path: '/api/ai' }
