const ACCENT = '#FF6B2C'

interface Props {
  done: number
  total: number
  size?: number
}

export default function ProgressRing({ done, total, size = 72 }: Props) {
  const r = (size - 10) / 2
  const c = 2 * Math.PI * r
  const pct = total > 0 ? done / total : 0
  const filled = c * pct

  return (
    <div className="ring-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#2a2d33" strokeWidth="7" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={ACCENT}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dasharray 0.4s' }}
        />
      </svg>
      <div className="ring-text">
        {done}/{total}
      </div>
    </div>
  )
}
