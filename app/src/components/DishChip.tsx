type Props = {
  name: string
  imageUrl?: string | null
  size?: 'sm' | 'md'
}

const COLORS = ['#c8cfa8', '#d9c6a8', '#c4b4a3', '#b9c7b0', '#d8b89f', '#c6c1a4']

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

export default function DishChip({ name, imageUrl, size = 'sm' }: Props) {
  const dim = size === 'md' ? 44 : 32
  const bg = COLORS[hash(name) % COLORS.length]
  const initial = name.replace(/[^A-Za-z]/g, '').charAt(0).toUpperCase() || '•'

  return (
    <div className="flex items-center gap-3">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          width={dim}
          height={dim}
          className="shrink-0 rounded-md object-cover"
          style={{ width: dim, height: dim }}
        />
      ) : (
        <div
          className="flex shrink-0 items-center justify-center rounded-md text-xs font-medium text-ink/70"
          style={{ width: dim, height: dim, background: bg }}
          aria-hidden
        >
          {initial}
        </div>
      )}
      <span className="truncate text-sm text-ink-soft">{name}</span>
    </div>
  )
}
