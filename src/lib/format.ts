export function round2(value: number): number {
  return Math.round(value * 100) / 100
}

export function toKop(value: number): number {
  return Math.round(value * 100)
}

export function fromKop(value: number): number {
  return value / 100
}

export function formatRub(value: number): string {
  const kop = Math.abs(Math.round(value * 100))
  const hasFraction = kop % 100 !== 0
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: hasFraction ? 2 : 0,
  }).format(value)
}

export function formatFullDate(ts: number): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(ts)
}

export function formatDay(ts: number): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
  }).format(ts)
}

export function formatDateTime(ts: number): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(ts)
}

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export function formatShare(value: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'percent',
    maximumFractionDigits: 0,
  }).format(value)
}
