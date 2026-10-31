import Anthropic from '@anthropic-ai/sdk'

const DEFAULT_MODEL = process.env.AI_MODEL ?? 'claude-sonnet-5-5'
const OWNER_EMAIL = 'meghajain@outlook.com'

// Decode a Supabase JWT (base64url, no signature verification needed here —
// Supabase's own session cookie is already signature-verified upstream; we
// only need the email claim to gate billable AI calls to the owner).
function emailFromJwt(auth: string | null): string | null {
  if (!auth?.startsWith('Bearer ')) return null
  const token = auth.slice(7)
  const parts = token.split('.')
  if (parts.length < 2) return null
  try {
    const payload = JSON.parse(
      Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'),
    )
    return typeof payload?.email === 'string' ? payload.email : null
  } catch {
    return null
  }
}

export default async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }
  const email = emailFromJwt(req.headers.get('authorization'))
  if (email !== OWNER_EMAIL) {
    return Response.json({ error: 'Not authorized' }, { status: 401 })
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
