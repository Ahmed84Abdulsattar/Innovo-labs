interface PageHeaderProps {
  title: string
  subtitle?: string
  eyebrow?: string
  actions?: React.ReactNode
  className?: string
}

export default function PageHeader({ title, subtitle, eyebrow, actions, className = '' }: PageHeaderProps) {
  return (
    <div className={`flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8 ${className}`}>
      <div className="min-w-0">
        {eyebrow && (
          <span className="eyebrow-badge" style={{ marginBottom: 12, display: 'inline-flex' }}>
            {eyebrow}
          </span>
        )}
        <h1 style={{
          fontSize: 22,
          fontWeight: 700,
          color: 'var(--text-primary)',
          lineHeight: 1.2,
          margin: 0,
          letterSpacing: '-0.028em',
        }}>{title}</h1>
        {subtitle && (
          <p style={{
            fontSize: 12,
            fontWeight: 300,
            color: 'var(--text-muted)',
            marginTop: 5,
            lineHeight: 1.55,
          }}>{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className={`flex items-center gap-2 flex-wrap sm:flex-nowrap sm:flex-shrink-0 sm:justify-end ${eyebrow ? 'sm:mt-7' : ''}`}>
          {actions}
        </div>
      )}
    </div>
  )
}
