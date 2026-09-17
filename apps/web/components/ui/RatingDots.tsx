const SCALE: Record<string, number> = { 'Underwhelming': 1, 'Has Potential': 2, 'Promising': 3, 'Impressive': 4 }
const COLOR: Record<string, string> = { 'Underwhalming': '#f87171', 'Has Potential': '#f59e0b', 'Promising': 'var(--chip-cyan)', 'Impressive': 'var(--accent)' }

interface RatingDotsProps { rating?: string; total?: number; size?: number }

export default function RatingDots({ rating, total = 4, size = 7 }: RatingDotsProps) {
  if (!rating) return <span className="text-xs" style={{ color: 'var(--gray-300)' }}>Not rated</span>
  const filled = SCALE[rating] || 0
  const color = COLOR[rating] || 'var(--accent)'
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} style={{
          width: size, height: size, borderRadius: '50%', display: 'inline-block',
          background: i < filled ? color : 'var(--border)',
          boxShadow: i < filled ? `0 0 5px ${color}50` : 'none',
          transition: 'all 0.2s',
        }} />
      ))}
    </div>
  )
}
