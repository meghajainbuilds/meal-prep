export default function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-ink"
      aria-hidden
    >
      <g stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
        <line x1="24" y1="6" x2="24" y2="42" />
        <line x1="8.5" y1="15" x2="39.5" y2="33" />
        <line x1="8.5" y1="33" x2="39.5" y2="15" />
        <line x1="6" y1="24" x2="42" y2="24" />
      </g>
    </svg>
  )
}
