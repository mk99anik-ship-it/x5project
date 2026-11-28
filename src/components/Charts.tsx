import { formatRub } from '../lib/format'

const COLORS = ['#0F5A05', '#5FAF2D', '#FAA028', '#3C82FF', '#05310A', '#FA6400', '#6ED2FA', '#1F7A32', '#1565C0']

export function Donut({ parts }: { parts: { label: string; value: number }[] }) {
  const total = parts.reduce((sum, part) => sum + part.value, 0)
  const radius = 46
  const circ = 2 * Math.PI * radius
  let offset = 0
  const label = parts.map((part) => `${part.label}: ${formatRub(part.value)}`).join(', ') || 'Нет данных'

  return (
    <div className="donut-wrap">
      <svg viewBox="0 0 140 140" className="donut" role="img" aria-label={label}>
        <circle cx="70" cy="70" r={radius} fill="none" stroke="#EAFBDC" strokeWidth="16" />
        {total > 0 &&
          parts.map((part, index) => {
            const length = (part.value / total) * circ
            const dash = `${length} ${circ - length}`
            const circle = (
              <circle
                key={part.label}
                cx="70"
                cy="70"
                r={radius}
                fill="none"
                stroke={COLORS[index % COLORS.length]}
                strokeWidth="16"
                strokeDasharray={dash}
                strokeDashoffset={-offset}
                transform="rotate(-90 70 70)"
              />
            )
            offset += length
            return circle
          })}
      </svg>
      <ul className="legend">
        {parts.map((part, index) => (
          <li key={part.label}>
            <i style={{ background: COLORS[index % COLORS.length] }} />
            <span>{part.label}</span>
            <b>{formatRub(part.value)}</b>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Bars({ rows }: { rows: { label: string; value: number }[] }) {
  const max = Math.max(...rows.map((row) => row.value), 1)
  if (rows.length === 0) return <p className="muted">Пока пусто.</p>
  return (
    <div className="bars">
      {rows.map((row) => (
        <div className="bar-row" key={row.label}>
          <span>{row.label}</span>
          <div className="bar-track" aria-hidden="true">
            <div style={{ width: `${Math.max(4, (row.value / max) * 100)}%` }} />
          </div>
          <b>{formatRub(row.value)}</b>
        </div>
      ))}
    </div>
  )
}
