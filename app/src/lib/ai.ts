import { supabase } from '../supabase'

export type AskOptions = {
  system?: string
  model?: string
  maxTokens?: number
}

export async function ask(prompt: string, opts: AskOptions = {}): Promise<string> {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch('/api/ai', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      prompt,
      system: opts.system,
      model: opts.model,
      max_tokens: opts.maxTokens,
    }),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`ai request failed (${res.status}): ${detail}`)
  }
  const data = (await res.json()) as { text: string }
  return data.text
}
