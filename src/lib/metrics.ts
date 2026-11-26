import { round3 } from './number';
import { formatDayShort, hoursBetween, moscowDayKey, shiftDayKey } from './time';
import type { Need, SurplusItem } from '../types';

export const CO2_KG_PER_FOOD_KG = 2.5;
export const ADULT_DAY_KG = 0.6;
export const CHILD_DAY_KG = 0.4;
export const ELDERLY_DAY_KG = 0.5;
export const PERSON_DAY_KG = 0.55;
export const RED_FLAG_HOURS = 6;

export function needDailyKg(need: Pick<Need, 'householdSize' | 'kids' | 'elderly'>): number {
  const adults = Math.max(0, need.householdSize - need.kids - need.elderly);
  return round3(adults * ADULT_DAY_KG + need.kids * CHILD_DAY_KG + need.elderly * ELDERLY_DAY_KG);
}

export function rescuedItems(items: SurplusItem[]): SurplusItem[] {
  return items.filter((item) => item.status === 'передано');
}

export function sumKg(items: SurplusItem[]): number {
  return round3(items.reduce((sum, item) => sum + item.weightKg, 0));
}

export function sumRub(items: SurplusItem[]): number {
  return Math.round(items.reduce((sum, item) => sum + item.valueRub, 0));
}

export function co2AvoidedKg(foodKg: number): number {
  return round3(foodKg * CO2_KG_PER_FOOD_KG);
}

export function personDays(foodKg: number): number {
  if (PERSON_DAY_KG <= 0) return 0;
  return foodKg / PERSON_DAY_KG;
}

export interface NeedCoverage {
  needId: string;
  requiredKg: number;
  coveredKg: number;
  ratio: number;
  closed: boolean;
  partial: boolean;
}

export function coverages(needs: Need[], items: SurplusItem[]): NeedCoverage[] {
  return needs.map((need) => {
    const requiredKg = needDailyKg(need);
    const coveredKg = round3(
      items
        .filter((item) => item.needId === need.id && (item.status === 'забронировано' || item.status === 'передано'))
        .reduce((sum, item) => sum + item.weightKg, 0),
    );
    const ratio = requiredKg <= 0 ? 0 : coveredKg / requiredKg;
    return {
      needId: need.id,
      requiredKg,
      coveredKg,
      ratio,
      closed: requiredKg > 0 && ratio >= 1,
      partial: requiredKg > 0 && coveredKg > 0 && ratio < 1,
    };
  });
}

export function needsClosedPercent(needs: Need[], items: SurplusItem[]): number {
  const rows = coverages(needs, items);
  const required = rows.reduce((sum, row) => sum + row.requiredKg, 0);
  if (required <= 0) return 0;
  const covered = rows.reduce((sum, row) => sum + Math.min(row.coveredKg, row.requiredKg), 0);
  return (covered / required) * 100;
}

export interface StoreStat {
  storeId: string;
  kg: number;
  rub: number;
  count: number;
}

export function topStores(items: SurplusItem[]): StoreStat[] {
  const map = new Map<string, StoreStat>();
  for (const item of rescuedItems(items)) {
    const current = map.get(item.storeId) ?? { storeId: item.storeId, kg: 0, rub: 0, count: 0 };
    current.kg = round3(current.kg + item.weightKg);
    current.rub += item.valueRub;
    current.count += 1;
    map.set(item.storeId, current);
  }
  return [...map.values()].sort((a, b) => b.kg - a.kg || b.rub - a.rub);
}

export interface DayPoint {
  day: string;
  label: string;
  kg: number;
  rub: number;
}

export function seriesByDay(items: SurplusItem[], now: Date, days = 14): DayPoint[] {
  const endKey = moscowDayKey(now);
  const keys: string[] = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) keys.push(shiftDayKey(endKey, -offset));
  const buckets = new Map(keys.map((key) => [key, { kg: 0, rub: 0 }]));
  for (const item of rescuedItems(items)) {
    if (!item.resolvedAt) continue;
    const bucket = buckets.get(moscowDayKey(item.resolvedAt));
    if (!bucket) continue;
    bucket.kg = round3(bucket.kg + item.weightKg);
    bucket.rub += item.valueRub;
  }
  return keys.map((day) => {
    const bucket = buckets.get(day)!;
    return {
      day,
      label: formatDayShort(`${day}T12:00:00+03:00`).replace('.', ''),
      kg: round3(bucket.kg),
      rub: Math.round(bucket.rub),
    };
  });
}

export interface RedFlag {
  itemId: string;
  storeId: string;
  name: string;
  hoursLeft: number;
  weightKg: number;
  expiresAt: string;
}

export function redFlags(items: SurplusItem[], now: Date, withinHours = RED_FLAG_HOURS): RedFlag[] {
  return items
    .filter((item) => item.status === 'доступно')
    .map((item) => ({ item, hoursLeft: hoursBetween(now, new Date(item.expiresAt)) }))
    .filter((row) => row.hoursLeft > 0 && row.hoursLeft <= withinHours)
    .map((row) => ({
      itemId: row.item.id,
      storeId: row.item.storeId,
      name: row.item.name,
      hoursLeft: row.hoursLeft,
      weightKg: row.item.weightKg,
      expiresAt: row.item.expiresAt,
    }))
    .sort((a, b) => a.hoursLeft - b.hoursLeft);
}

export interface DashboardMetrics {
  rescuedKg: number;
  co2Kg: number;
  personDays: number;
  valueRub: number;
  needsClosedPercent: number;
  closedCount: number;
  partialCount: number;
  needCount: number;
  topStores: StoreStat[];
  series: DayPoint[];
  flags: RedFlag[];
}

export function dashboardMetrics(needs: Need[], items: SurplusItem[], now: Date): DashboardMetrics {
  const rescued = rescuedItems(items);
  const rescuedKg = sumKg(rescued);
  const rows = coverages(needs, items);
  return {
    rescuedKg,
    co2Kg: co2AvoidedKg(rescuedKg),
    personDays: personDays(rescuedKg),
    valueRub: sumRub(rescued),
    needsClosedPercent: needsClosedPercent(needs, items),
    closedCount: rows.filter((row) => row.closed).length,
    partialCount: rows.filter((row) => row.partial).length,
    needCount: needs.length,
    topStores: topStores(items),
    series: seriesByDay(items, now, 14),
    flags: redFlags(items, now),
  };
}

export function isOnTodayShelf(item: SurplusItem, now: Date): boolean {
  const today = moscowDayKey(now);
  if (moscowDayKey(item.addedAt) === today) return true;
  if (item.resolvedAt && moscowDayKey(item.resolvedAt) === today) return true;
  return item.status === 'доступно' || item.status === 'забронировано';
}
