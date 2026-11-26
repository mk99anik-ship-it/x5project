import { formatMoscowTime, moscowDayKey, moscowIso, shiftDayKey } from './time';

export interface Slot {
  start: string;
  end: string;
  label: string;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function slotBetween(start: Date, end: Date, prefix = ''): Slot {
  const label = `${prefix}${formatMoscowTime(start)}–${formatMoscowTime(end)}`.trim();
  return { start: start.toISOString(), end: end.toISOString(), label };
}

export function upcomingSlots(now: Date, count = 6): Slot[] {
  const slots: Slot[] = [];
  const key = moscowDayKey(now);
  const hours = [17.5, 18, 18.5, 19, 19.5, 20, 20.5, 21];
  for (const hourValue of hours) {
    const hour = Math.floor(hourValue);
    const minute = hourValue % 1 === 0 ? 0 : 30;
    const start = new Date(moscowIso(key, hour, minute));
    const end = new Date(start.getTime() + 30 * 60_000);
    if (end.getTime() <= now.getTime() + 10 * 60_000) continue;
    slots.push(slotBetween(start, end));
  }
  if (slots.length < 3) {
    const tomorrow = shiftDayKey(key, 1);
    for (const hour of [10, 11, 12, 13]) {
      const start = new Date(moscowIso(tomorrow, hour, 0));
      const end = new Date(start.getTime() + 60 * 60_000);
      slots.push({
        start: start.toISOString(),
        end: end.toISOString(),
        label: `завтра ${pad(hour)}:00–${pad(hour + 1)}:00`,
      });
    }
  }
  return slots.slice(0, count);
}

export function firstFeasibleSlot(now: Date, expiresAt: string): Slot | null {
  const expiry = new Date(expiresAt).getTime();
  for (const slot of upcomingSlots(now, 8)) {
    if (new Date(slot.end).getTime() <= expiry) return slot;
  }
  const quickEnd = Math.min(expiry - 5 * 60_000, now.getTime() + 45 * 60_000);
  if (quickEnd > now.getTime() + 20 * 60_000) {
    return slotBetween(new Date(now.getTime() + 15 * 60_000), new Date(quickEnd));
  }
  return null;
}

export function slotFitsExpiry(slot: Slot, expiresAt: string): boolean {
  return new Date(slot.end).getTime() <= new Date(expiresAt).getTime();
}
