export type AskOptions = {
  system?: string
  model?: string
  maxTokens?: number
}

export async function ask(prompt: string, opts: AskOptions = {}): Promise<string> {
  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
