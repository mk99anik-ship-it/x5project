const TZ = 'Europe/Moscow';

export function moscowParts(date: Date): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
} {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const map: Record<string, string> = {};
  for (const part of fmt.formatToParts(date)) {
    if (part.type !== 'literal') map[part.type] = part.value;
  }
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
  };
}

export function moscowDayKey(isoOrDate: string | Date): string {
  const date = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  const parts = moscowParts(date);
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

export function moscowIso(ymd: string, hour: number, minute: number): string {
  const hh = String(hour).padStart(2, '0');
  const mm = String(minute).padStart(2, '0');
  return `${ymd}T${hh}:${mm}:00+03:00`;
}

export function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 3_600_000);
}

export function hoursBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / 3_600_000;
}

export function moscowDayEnd(now: Date): Date {
  return new Date(`${moscowDayKey(now)}T23:59:59+03:00`);
}

export function shiftDayKey(ymd: string, days: number): string {
  const base = new Date(`${ymd}T12:00:00+03:00`);
  return moscowDayKey(new Date(base.getTime() + days * 86_400_000));
}

export function formatMoscow(iso: string, withTime = true): string {
  const options: Intl.DateTimeFormatOptions = withTime
    ? { timeZone: TZ, day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }
    : { timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric' };
  return new Intl.DateTimeFormat('ru-RU', options).format(new Date(iso));
}

export function formatMoscowTime(isoOrDate: string | Date): string {
  const date = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatDayShort(isoOrDate: string | Date): string {
  const date = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone: TZ,
    day: 'numeric',
    month: 'short',
  }).format(date);
}

export function formatHoursLeft(hours: number): string {
  if (hours < 0) return 'срок вышел';
  if (hours < 1) {
    const minutes = Math.max(1, Math.round(hours * 60));
    return `${minutes} мин`;
  }
  const whole = Math.floor(hours);
  const minutes = Math.round((hours - whole) * 60);
  if (minutes === 0) return `${whole} ч`;
  return `${whole} ч ${minutes} мин`;
}

export type ExpiryPreset = 'tonight' | 'tomorrow' | 'twodays';

export function presetExpiry(now: Date, preset: ExpiryPreset): string {
  const key = moscowDayKey(now);
  if (preset === 'tonight') {
    const tonight = new Date(`${key}T21:00:00+03:00`);
    if (tonight.getTime() <= now.getTime() + 30 * 60_000) return addHours(now, 3).toISOString();
    return tonight.toISOString();
  }
  if (preset === 'tomorrow') return moscowIso(shiftDayKey(key, 1), 12, 0);
  return moscowIso(shiftDayKey(key, 2), 18, 0);
}

export function presetLabel(now: Date, preset: ExpiryPreset): string {
  if (preset === 'tonight') {
    const tonight = new Date(`${moscowDayKey(now)}T21:00:00+03:00`);
    if (tonight.getTime() <= now.getTime() + 30 * 60_000) return 'Через 3 часа';
    return 'Сегодня до 21:00';
  }
  if (preset === 'tomorrow') return 'Завтра, 12:00';
  return 'Через 2 дня';
}

export function parseMoscowInput(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const date = new Date(`${value}:00+03:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}
