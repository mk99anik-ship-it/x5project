export function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
