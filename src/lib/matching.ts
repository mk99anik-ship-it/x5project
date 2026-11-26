import { distanceKm, formatKm } from './geo';
import { needDailyKg } from './metrics';
import { clamp } from './number';
import { formatHoursLeft, hoursBetween } from './time';
import type { Category, HelpPoint, Need, Priority, Store, SurplusItem } from '../types';

export const SCORE_MAX = {
  fit: 35,
  urgency: 30,
  distance: 20,
  priority: 10,
  portion: 5,
} as const;

export interface ScoreParts {
  fit: number;
  urgency: number;
  distance: number;
  priority: number;
  portion: number;
}

export interface Suggestion {
  itemId: string;
  score: number;
  parts: ScoreParts;
  reasons: string[];
  distanceKm: number;
  hoursLeft: number;
}

const CATEGORY_REASON: Record<Category, string> = {
  молочные: 'Молочные продукты закрывают базовую нужду семьи',
  хлеб: 'Хлеб закрывает ежедневную потребность',
  'овощи и фрукты': 'Овощи и фрукты дополняют рацион свежими продуктами',
  'мясо и птица': 'Белковый продукт для полноценного рациона',
  бакалея: 'Бакалея хранится дольше и пополняет запас',
  'детское питание': 'Отдельная партия детского питания',
  'готовая еда': 'Готовую еду можно отдать сразу, без готовки',
  напитки: 'Напиток дополняет продуктовый набор',
  заморозка: 'Заморозка даёт запас, если в пункте есть морозилка',
  яйца: 'Яйца — компактный источник белка',
};

function scoreFit(need: Need, item: SurplusItem): { points: number; reasons: string[]; blocked: boolean } {
  if (need.restrictions.includes('без глютена') && item.gluten) {
    return { points: 0, reasons: [], blocked: true };
  }
  let points = ['молочные', 'овощи и фрукты', 'мясо и птица', 'бакалея', 'яйца', 'детское питание'].includes(
    item.category,
  )
    ? 10
    : 8;
  const reasons = [CATEGORY_REASON[item.category]];
  if (need.restrictions.includes('без глютена')) {
    points += 8;
    reasons.push('Без глютена — совпадает с ограничением');
  }
  const wantsBaby = need.restrictions.includes('детское питание') || need.kids > 0;
  if (wantsBaby && item.baby) {
    points += 10;
    reasons.push(need.kids > 0 ? 'Детское питание нужно семье с детьми' : 'Закрывает запрос на детское питание');
  } else if (need.kids > 0 && (item.category === 'молочные' || item.category === 'овощи и фрукты')) {
    points += 4;
    reasons.push('Подходит семье, где есть дети');
  }
  if (
    need.elderly > 0 &&
    (item.category === 'молочные' || item.category === 'овощи и фрукты' || item.category === 'готовая еда')
  ) {
    points += 4;
    reasons.push('Удобно пожилым: готовое или мягкое');
  }
  if (need.restrictions.includes('диабет')) {
    if (item.sugar === 'низкий') {
      points += 7;
      reasons.push('Мало сахара — уместно при диабете');
    } else if (item.sugar === 'средний') {
      points += 2;
      reasons.push('Сахара немного — лучше проверить состав');
    } else {
      points -= 18;
      reasons.push('Много сахара — плохо подходит при диабете');
    }
  }
  return { points: clamp(points, 0, SCORE_MAX.fit), reasons, blocked: false };
}

function scoreUrgency(hours: number): { points: number; reason: string } {
  if (hours <= 6) {
    return { points: 30, reason: `Истекает через ${formatHoursLeft(hours)} — важно успеть сегодня` };
  }
  if (hours <= 18) {
    return { points: 22, reason: `Скоропорт на сегодня: осталось ${formatHoursLeft(hours)}` };
  }
  if (hours <= 36) return { points: 14, reason: `Срок до завтра (${formatHoursLeft(hours)})` };
  if (hours <= 72) return { points: 8, reason: 'Срок в ближайшие три дня' };
  return { points: 4, reason: 'Срок позволяет забрать не сразу' };
}

function scoreDistance(km: number): { points: number; reason: string } {
  const pretty = formatKm(km);
  if (km <= 2) return { points: 20, reason: `Близко к пункту: ${pretty}` };
  if (km <= 5) return { points: 16, reason: `В пределах района: ${pretty}` };
  if (km <= 8) return { points: 12, reason: `Дорога займёт немного времени: ${pretty}` };
  if (km <= 12) return { points: 7, reason: `Дальше, но реально забрать: ${pretty}` };
  return { points: 3, reason: `Дальний магазин: ${pretty}` };
}

function scorePriority(priority: Priority, hours: number): { points: number; reasons: string[] } {
  if (priority === 'срочный' && hours <= 24) {
    return { points: 10, reasons: ['Срочная нужда: короткий срок поднимает товар выше'] };
  }
  if (priority === 'срочный') return { points: 4, reasons: ['Срочная нужда'] };
  if (priority === 'высокий' && hours <= 48) {
    return { points: 6, reasons: ['Высокий приоритет и близкий срок'] };
  }
  if (priority === 'высокий') return { points: 3, reasons: ['Высокий приоритет нужды'] };
  return { points: 0, reasons: [] };
}

function scorePortion(weightKg: number, requiredKg: number): { points: number; reasons: string[] } {
  const ratio = weightKg / Math.max(requiredKg, 0.1);
  if (ratio >= 0.25 && ratio <= 1.5) {
    return { points: 5, reasons: ['Вес партии хорошо закрывает суточную нужду'] };
  }
  if (ratio < 0.25) return { points: 3, reasons: ['Небольшая партия — можно дополнить другим товаром'] };
  return { points: 4, reasons: ['Крупная партия закроет нужду с запасом'] };
}

export function suggestMatches(
  need: Need,
  point: HelpPoint,
  items: SurplusItem[],
  stores: Store[],
  now: Date,
  limit = 8,
): Suggestion[] {
  const storeById = new Map(stores.map((store) => [store.id, store]));
  const required = Math.max(needDailyKg(need), 0.1);
  const suggestions: Suggestion[] = [];
  for (const item of items) {
    if (item.status !== 'доступно') continue;
    const store = storeById.get(item.storeId);
    if (!store) continue;
    const hoursLeft = hoursBetween(now, new Date(item.expiresAt));
    if (hoursLeft <= 0) continue;
    const fit = scoreFit(need, item);
    if (fit.blocked) continue;
    const urgency = scoreUrgency(hoursLeft);
    const km = distanceKm(point.lat, point.lng, store.lat, store.lng);
    const distance = scoreDistance(km);
    const priority = scorePriority(need.priority, hoursLeft);
    const portion = scorePortion(item.weightKg, required);
    const parts: ScoreParts = {
      fit: fit.points,
      urgency: urgency.points,
      distance: distance.points,
      priority: priority.points,
      portion: portion.points,
    };
    suggestions.push({
      itemId: item.id,
      score: parts.fit + parts.urgency + parts.distance + parts.priority + parts.portion,
      parts,
      reasons: [...fit.reasons, urgency.reason, distance.reason, ...priority.reasons, ...portion.reasons],
      distanceKm: km,
      hoursLeft,
    });
  }
  suggestions.sort((a, b) => b.score - a.score || a.hoursLeft - b.hoursLeft || a.itemId.localeCompare(b.itemId));
  return suggestions.slice(0, limit);
}
