export function periodKey(ts: number): string {
  const date = new Date(ts)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function periodStart(ts: number): number {
  const date = new Date(ts)
  return new Date(date.getFullYear(), date.getMonth(), 1).getTime()
}

export function periodEnd(ts: number): number {
  const date = new Date(ts)
  return new Date(date.getFullYear(), date.getMonth() + 1, 1).getTime() - 1
}

export function addMonths(ts: number, months: number): number {
  const date = new Date(ts)
  const day = date.getDate()
  date.setDate(1)
  date.setMonth(date.getMonth() + months)
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  date.setDate(Math.min(day, last))
  return date.getTime()
}

export function addDays(ts: number, days: number): number {
  return ts + days * 24 * 60 * 60 * 1000
}

export function periodLabel(ts: number): string {
  return new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' }).format(ts)
}
