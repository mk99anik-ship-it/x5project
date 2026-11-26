export function formatKg(n: number): string {
  return `${n.toLocaleString('ru-RU', { maximumFractionDigits: 1, minimumFractionDigits: 0 })} кг`;
}

export function formatRub(n: number): string {
  return `${Math.round(n).toLocaleString('ru-RU')} ₽`;
}

export function formatInt(n: number): string {
  return Math.round(n).toLocaleString('ru-RU');
}

export function formatFixed(n: number, digits = 1): string {
  return n.toLocaleString('ru-RU', { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

export function plural(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(Math.trunc(n)) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (last > 1 && last < 5) return few;
  if (last === 1) return one;
  return many;
}
