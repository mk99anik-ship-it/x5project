import { describe, expect, it } from 'vitest';
import { distanceKm } from './geo';
import { SCORE_MAX, suggestMatches } from './matching';
import type { HelpPoint, Need, Store, SurplusItem } from '../types';

const NOW = new Date('2026-11-26T12:00:00+03:00');

const point: HelpPoint = {
  id: 'p',
  name: 'Пункт',
  district: 'Арбат',
  address: 'ул. Арбат, 1',
  lat: 55.75,
  lng: 37.59,
};

function store(id: string, lat: number, lng: number): Store {
  return { id, name: id, address: 'адрес', district: 'Арбат', lat, lng, closesAt: '22:00' };
}

function need(partial: Partial<Need> = {}): Need {
  return {
    id: 'need',
    pointId: 'p',
    householdSize: 2,
    kids: 0,
    elderly: 0,
    restrictions: [],
    priority: 'обычный',
    createdAt: NOW.toISOString(),
    note: '',
    ...partial,
  };
}

function item(partial: Partial<SurplusItem> & Pick<SurplusItem, 'id' | 'storeId'>): SurplusItem {
  return {
    catalogId: 'milk',
    name: 'Молоко',
    category: 'молочные',
    storage: 'холод',
    quantity: 1,
    unit: 'уп',
    weightKg: 1,
    valueRub: 90,
    expiresAt: new Date(NOW.getTime() + 5 * 3_600_000).toISOString(),
    addedAt: NOW.toISOString(),
    status: 'доступно',
    gluten: false,
    sugar: 'низкий',
    baby: false,
    ...partial,
  };
}

describe('suggestMatches', () => {
  const near = store('near', 55.75, 37.59);
  const far = store('far', 55.95, 37.95);

  it('drops gluten items for a gluten-free need and explains a safe match', () => {
    const matches = suggestMatches(
      need({ restrictions: ['без глютена'] }),
      point,
      [
        item({ id: 'bread', storeId: 'near', category: 'хлеб', gluten: true, name: 'Хлеб' }),
        item({ id: 'rice', storeId: 'near', category: 'бакалея', name: 'Рис' }),
      ],
      [near],
      NOW,
    );
    expect(matches.map((match) => match.itemId)).toEqual(['rice']);
    expect(matches[0].reasons.some((reason) => reason.includes('Без глютена'))).toBe(true);
  });

  it('ranks baby food above a staple for a family with children', () => {
    const matches = suggestMatches(
      need({ kids: 1, householdSize: 2, restrictions: ['детское питание'], priority: 'срочный' }),
      point,
      [
        item({ id: 'rice', storeId: 'near', category: 'бакалея', weightKg: 0.8 }),
        item({ id: 'puree', storeId: 'near', category: 'детское питание', baby: true, weightKg: 0.8, name: 'Пюре' }),
      ],
      [near],
      NOW,
    );
    expect(matches[0].itemId).toBe('puree');
    expect(matches[0].reasons.some((reason) => reason.includes('Детское'))).toBe(true);
  });

  it('prefers the closer store when the product is otherwise the same', () => {
    const matches = suggestMatches(
      need(),
      point,
      [item({ id: 'far-milk', storeId: 'far' }), item({ id: 'near-milk', storeId: 'near' })],
      [near, far],
      NOW,
    );
    expect(matches[0].itemId).toBe('near-milk');
    expect(matches[0].distanceKm).toBeLessThan(matches[1].distanceKm);
  });

  it('prefers the earlier expiry', () => {
    const matches = suggestMatches(
      need(),
      point,
      [
        item({ id: 'late', storeId: 'near', expiresAt: new Date(NOW.getTime() + 70 * 3_600_000).toISOString() }),
        item({ id: 'soon', storeId: 'near', expiresAt: new Date(NOW.getTime() + 3 * 3_600_000).toISOString() }),
      ],
      [near],
      NOW,
    );
    expect(matches[0].itemId).toBe('soon');
    expect(matches[0].parts.urgency).toBeGreaterThan(matches[1].parts.urgency);
  });

  it('gives an urgent need a higher score on a short-dated item', () => {
    const goods = [item({ id: 'soon', storeId: 'near' })];
    const calm = suggestMatches(need({ priority: 'обычный' }), point, goods, [near], NOW)[0];
    const urgent = suggestMatches(need({ priority: 'срочный' }), point, goods, [near], NOW)[0];
    expect(urgent.score).toBeGreaterThan(calm.score);
    expect(urgent.parts.priority).toBe(SCORE_MAX.priority);
  });

  it('ranks low sugar above a sweet drink for diabetes', () => {
    const matches = suggestMatches(
      need({ restrictions: ['диабет'] }),
      point,
      [
        item({ id: 'juice', storeId: 'near', category: 'напитки', sugar: 'высокий', name: 'Сок' }),
        item({ id: 'milk', storeId: 'near', sugar: 'низкий' }),
      ],
      [near],
      NOW,
    );
    expect(matches[0].itemId).toBe('milk');
    expect(matches.find((match) => match.itemId === 'juice')?.reasons.some((reason) => reason.includes('сахара'))).toBe(true);
  });

  it('ignores expired and booked items and keeps the score inside 100', () => {
    const matches = suggestMatches(
      need({ priority: 'срочный', kids: 2, elderly: 1, householdSize: 4, restrictions: ['без глютена', 'детское питание'] }),
      point,
      [
        item({ id: 'old', storeId: 'near', expiresAt: new Date(NOW.getTime() - 3_600_000).toISOString() }),
        item({ id: 'held', storeId: 'near', status: 'забронировано' }),
        item({ id: 'ok', storeId: 'near', baby: true, category: 'детское питание' }),
      ],
      [near],
      NOW,
    );
    expect(matches.map((match) => match.itemId)).toEqual(['ok']);
    const match = matches[0];
    expect(match.score).toBeLessThanOrEqual(100);
    expect(match.score).toBe(match.parts.fit + match.parts.urgency + match.parts.distance + match.parts.priority + match.parts.portion);
    expect(match.parts.fit).toBeLessThanOrEqual(SCORE_MAX.fit);
    expect(match.parts.urgency).toBeLessThanOrEqual(SCORE_MAX.urgency);
    expect(match.parts.distance).toBeLessThanOrEqual(SCORE_MAX.distance);
    expect(match.reasons.length).toBeGreaterThan(2);
  });
});

describe('distanceKm', () => {
  it('is zero for the same point and about 111 km per degree of latitude', () => {
    expect(distanceKm(55.75, 37.59, 55.75, 37.59)).toBe(0);
    expect(distanceKm(0, 0, 1, 0)).toBeGreaterThan(110);
    expect(distanceKm(0, 0, 1, 0)).toBeLessThan(112);
  });
});
