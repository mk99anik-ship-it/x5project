import { describe, expect, it } from 'vitest';
import { buildDemo } from '../data/seed';
import {
  ADULT_DAY_KG,
  CHILD_DAY_KG,
  CO2_KG_PER_FOOD_KG,
  ELDERLY_DAY_KG,
  PERSON_DAY_KG,
  co2AvoidedKg,
  coverages,
  dashboardMetrics,
  needDailyKg,
  needsClosedPercent,
  personDays,
  redFlags,
  seriesByDay,
  sumKg,
  sumRub,
  topStores,
} from './metrics';
import { expireState, handoverItems } from './operations';
import { upcomingSlots } from './slots';
import { moscowDayKey, moscowParts } from './time';
import type { Need, SurplusItem } from '../types';

const NOW = new Date('2026-11-26T15:00:00+03:00');

function bareItem(partial: Partial<SurplusItem> & Pick<SurplusItem, 'id'>): SurplusItem {
  return {
    storeId: 's12',
    catalogId: 'milk',
    name: 'Молоко',
    category: 'молочные',
    storage: 'холод',
    quantity: 1,
    unit: 'уп',
    weightKg: 1,
    valueRub: 100,
    expiresAt: new Date(NOW.getTime() + 5 * 3_600_000).toISOString(),
    addedAt: NOW.toISOString(),
    status: 'доступно',
    gluten: false,
    sugar: 'низкий',
    baby: false,
    ...partial,
  };
}

function bareNeed(partial: Partial<Need> & Pick<Need, 'id'>): Need {
  return {
    pointId: 'p',
    householdSize: 1,
    kids: 0,
    elderly: 0,
    restrictions: [],
    priority: 'обычный',
    createdAt: NOW.toISOString(),
    note: '',
    ...partial,
  };
}

describe('dashboard calculations', () => {
  it('sums only rescued weight and value', () => {
    const items = [
      bareItem({ id: 'a', status: 'передано', weightKg: 1.5, valueRub: 100 }),
      bareItem({ id: 'b', status: 'передано', weightKg: 2, valueRub: 50.4 }),
      bareItem({ id: 'c', status: 'доступно', weightKg: 9, valueRub: 900 }),
    ];
    expect(sumKg(items.filter((item) => item.status === 'передано'))).toBe(3.5);
    expect(sumRub(items.filter((item) => item.status === 'передано'))).toBe(150);
  });

  it('applies the documented CO2 and person-day coefficients', () => {
    expect(CO2_KG_PER_FOOD_KG).toBe(2.5);
    expect(PERSON_DAY_KG).toBe(0.55);
    expect(co2AvoidedKg(10)).toBe(25);
    expect(personDays(5.5)).toBeCloseTo(10);
  });

  it('builds a household norm from adults, children and elderly', () => {
    expect(ADULT_DAY_KG).toBe(0.6);
    expect(CHILD_DAY_KG).toBe(0.4);
    expect(ELDERLY_DAY_KG).toBe(0.5);
    expect(needDailyKg(bareNeed({ id: 'n', householdSize: 4, kids: 2, elderly: 1 }))).toBeCloseTo(0.6 + 0.8 + 0.5);
  });

  it('weights closed needs by covered kilograms and caps each request at its norm', () => {
    const needs = [
      bareNeed({ id: 'a', householdSize: 1 }),
      bareNeed({ id: 'b', householdSize: 1 }),
    ];
    const items = [
      bareItem({ id: 'full', needId: 'a', status: 'передано', weightKg: 2 }),
      bareItem({ id: 'half', needId: 'b', status: 'забронировано', weightKg: 0.3 }),
      bareItem({ id: 'free', status: 'доступно', weightKg: 5, needId: 'b' }),
    ];
    const rows = coverages(needs, items);
    expect(rows[0].closed).toBe(true);
    expect(rows[1].partial).toBe(true);
    expect(needsClosedPercent(needs, items)).toBeCloseTo(((0.6 + 0.3) / 1.2) * 100);
  });

  it('flags only free items expiring inside six hours', () => {
    const items = [
      bareItem({ id: 'hot', expiresAt: new Date(NOW.getTime() + 2 * 3_600_000).toISOString() }),
      bareItem({ id: 'later', expiresAt: new Date(NOW.getTime() + 10 * 3_600_000).toISOString() }),
      bareItem({ id: 'held', status: 'забронировано', expiresAt: new Date(NOW.getTime() + 2 * 3_600_000).toISOString() }),
      bareItem({ id: 'gone', expiresAt: new Date(NOW.getTime() - 3_600_000).toISOString() }),
    ];
    expect(redFlags(items, NOW).map((flag) => flag.itemId)).toEqual(['hot']);
  });

  it('ranks stores and buckets a fortnight by handover day', () => {
    const yesterday = '2026-11-25T19:00:00+03:00';
    const items = [
      bareItem({ id: 'a', storeId: 's12', status: 'передано', weightKg: 2, valueRub: 10, resolvedAt: NOW.toISOString() }),
      bareItem({ id: 'b', storeId: 's47', status: 'передано', weightKg: 5, valueRub: 20, resolvedAt: yesterday }),
      bareItem({ id: 'c', storeId: 's12', status: 'списано', weightKg: 8, resolvedAt: NOW.toISOString() }),
    ];
    expect(topStores(items).map((store) => store.storeId)).toEqual(['s47', 's12']);
    const series = seriesByDay(items, NOW, 14);
    expect(series).toHaveLength(14);
    expect(series.at(-1)?.kg).toBe(2);
    expect(series.at(-2)?.kg).toBe(5);
    const metrics = dashboardMetrics([bareNeed({ id: 'n' })], items, NOW);
    expect(metrics.rescuedKg).toBe(7);
    expect(metrics.co2Kg).toBe(17.5);
  });
});

describe('demo state and booking expiry', () => {
  it('seeds stores, needs and a shelf with red flags', () => {
    const state = buildDemo(NOW);
    expect(state.stores).toHaveLength(6);
    expect(state.needs).toHaveLength(15);
    expect(state.volunteers.length).toBeGreaterThanOrEqual(4);
    expect(state.items.length).toBeGreaterThanOrEqual(40);
    expect(redFlags(state.items, NOW).length).toBeGreaterThanOrEqual(3);
    expect(state.items.some((item) => item.status === 'забронировано')).toBe(true);
  });

  it('returns a missed pickup to the shelf and writes off an already expired one', () => {
    const state = buildDemo(NOW);
    const booking = state.bookings[0];
    const booked = state.items.find((item) => item.bookingId === booking.id);
    expect(booked?.status).toBe('забронировано');
    const released = expireState(
      {
        ...state,
        bookings: state.bookings.map((item) =>
          item.id === booking.id ? { ...item, slotEnd: new Date(NOW.getTime() - 60_000).toISOString() } : item,
        ),
      },
      NOW,
    );
    expect(released.items.find((item) => item.id === booked?.id)?.status).toBe('доступно');
    expect(released.bookings.find((item) => item.id === booking.id)?.status).toBe('истекла');

    const expired = expireState(
      {
        ...state,
        items: state.items.map((item) =>
          item.id === booked?.id ? { ...item, expiresAt: new Date(NOW.getTime() - 60_000).toISOString() } : item,
        ),
      },
      NOW,
    );
    expect(expired.items.find((item) => item.id === booked?.id)?.status).toBe('списано');
  });

  it('completes a booking when its item is handed over', () => {
    const state = buildDemo(NOW);
    const booking = state.bookings.find((item) => item.volunteerId === 'v1');
    expect(booking).toBeTruthy();
    const result = handoverItems(state, booking?.itemIds ?? [], NOW);
    expect(result.ok).toBe(true);
    if (!result.ok || !result.act) return;
    expect(result.act.lines.length).toBe(booking?.itemIds.length);
    expect(result.act.totalKg).toBeGreaterThan(0);
    expect(result.state.items.find((item) => item.id === booking?.itemIds[0])?.status).toBe('передано');
    expect(result.state.bookings.find((item) => item.id === booking?.id)?.status).toBe('выполнена');
  });

  it('offers this evening at noon and the next morning late at night', () => {
    const noon = upcomingSlots(new Date('2026-11-26T12:00:00+03:00'));
    const first = moscowParts(new Date(noon[0].start));
    expect(first.hour).toBe(17);
    expect(first.minute).toBe(30);
    const late = upcomingSlots(new Date('2026-11-26T22:30:00+03:00'));
    expect(moscowDayKey(late[0].start)).toBe('2026-11-27');
  });
});
