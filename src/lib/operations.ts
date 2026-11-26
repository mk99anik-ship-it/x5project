import { uid } from './id';
import { round3 } from './number';
import { moscowDayKey } from './time';
import type { AppState, Booking, HandoverAct, Need, SurplusItem } from '../types';

export type OpResult = { ok: true; state: AppState; act?: HandoverAct } | { ok: false; error: string };

export interface AddInput {
  storeId: string;
  catalogId: string;
  quantity: number;
  expiresAt: string;
  now: Date;
}

export interface BookInput {
  itemIds: string[];
  volunteerId: string | null;
  needId: string | null;
  slotStart: string;
  slotEnd: string;
  slotLabel: string;
  now: Date;
}

function replaceItems(state: AppState, items: SurplusItem[]): AppState {
  return { ...state, items };
}

export function expireState(state: AppState, now: Date): AppState {
  const nowMs = now.getTime();
  const expiredBookingIds = new Set(
    state.bookings
      .filter((booking) => booking.status === 'активна' && new Date(booking.slotEnd).getTime() <= nowMs)
      .map((booking) => booking.id),
  );
  const bookings: Booking[] = state.bookings.map((booking) =>
    expiredBookingIds.has(booking.id) ? { ...booking, status: 'истекла' } : booking,
  );
  let items = state.items.map((item) => {
    if (item.status === 'передано' || item.status === 'списано') return item;
    const expired = new Date(item.expiresAt).getTime() <= nowMs;
    const bookingGone = Boolean(item.bookingId && expiredBookingIds.has(item.bookingId));
    if (expired) {
      return {
        ...item,
        status: 'списано' as const,
        bookingId: undefined,
        resolvedAt: item.resolvedAt ?? now.toISOString(),
      };
    }
    if (item.status === 'забронировано' && bookingGone) {
      return { ...item, status: 'доступно' as const, bookingId: undefined };
    }
    return item;
  });
  const activeIds = new Set(bookings.filter((booking) => booking.status === 'активна').map((booking) => booking.id));
  items = items.map((item) => {
    if (item.status === 'забронировано' && item.bookingId && !activeIds.has(item.bookingId)) {
      return { ...item, status: 'доступно' as const, bookingId: undefined };
    }
    return item;
  });
  const nextBookings = bookings.map((booking) => {
    if (booking.status !== 'активна') return booking;
    const stillHeld = items.some((item) => item.bookingId === booking.id && item.status === 'забронировано');
    return stillHeld ? booking : { ...booking, status: 'истекла' as const };
  });
  return { ...state, items, bookings: nextBookings };
}

export function addSurplus(state: AppState, input: AddInput): OpResult {
  const catalog = state.catalog.find((item) => item.id === input.catalogId);
  const store = state.stores.find((item) => item.id === input.storeId);
  if (!catalog || !store) return { ok: false, error: 'Товар или магазин не найден' };
  if (!Number.isFinite(input.quantity) || input.quantity <= 0 || input.quantity > 99) {
    return { ok: false, error: 'Укажите количество от 1 до 99' };
  }
  const expiry = new Date(input.expiresAt);
  if (Number.isNaN(expiry.getTime()) || expiry.getTime() <= input.now.getTime()) {
    return { ok: false, error: 'Срок годности должен быть позже текущего времени' };
  }
  const quantity = Math.round(input.quantity * 10) / 10;
  const item: SurplusItem = {
    id: uid('item'),
    storeId: store.id,
    catalogId: catalog.id,
    name: catalog.name,
    category: catalog.category,
    storage: catalog.storage,
    quantity,
    unit: catalog.unit,
    weightKg: round3(catalog.unitKg * quantity),
    valueRub: Math.round(catalog.priceRub * quantity),
    expiresAt: expiry.toISOString(),
    addedAt: input.now.toISOString(),
    status: 'доступно',
    gluten: catalog.gluten,
    sugar: catalog.sugar,
    baby: catalog.baby,
  };
  return { ok: true, state: { ...state, items: [item, ...state.items] } };
}

export function bookItems(state: AppState, input: BookInput): OpResult {
  const unique = [...new Set(input.itemIds)];
  if (unique.length === 0) return { ok: false, error: 'Выберите хотя бы один товар' };
  const chosen = unique.map((id) => state.items.find((item) => item.id === id));
  if (chosen.some((item) => !item)) return { ok: false, error: 'Товар не найден' };
  const items = chosen as SurplusItem[];
  if (items.some((item) => item.status !== 'доступно')) {
    return { ok: false, error: 'Бронируются только свободные товары' };
  }
  const storeIds = new Set(items.map((item) => item.storeId));
  if (storeIds.size !== 1) return { ok: false, error: 'В одной брони только один магазин' };
  const slotStart = new Date(input.slotStart);
  const slotEnd = new Date(input.slotEnd);
  if (Number.isNaN(slotStart.getTime()) || Number.isNaN(slotEnd.getTime()) || slotEnd <= slotStart) {
    return { ok: false, error: 'Некорректный слот' };
  }
  if (slotEnd.getTime() <= input.now.getTime()) return { ok: false, error: 'Этот слот уже прошёл' };
  const earliestExpiry = Math.min(...items.map((item) => new Date(item.expiresAt).getTime()));
  if (slotEnd.getTime() > earliestExpiry) {
    return { ok: false, error: 'Слот заканчивается позже срока годности' };
  }
  if (input.needId && !state.needs.some((need) => need.id === input.needId)) {
    return { ok: false, error: 'Нужда не найдена' };
  }
  const booking: Booking = {
    id: uid('book'),
    itemIds: unique,
    storeId: items[0].storeId,
    volunteerId: input.volunteerId,
    needId: input.needId,
    slotStart: slotStart.toISOString(),
    slotEnd: slotEnd.toISOString(),
    slotLabel: input.slotLabel,
    status: 'активна',
    createdAt: input.now.toISOString(),
  };
  const idSet = new Set(unique);
  const nextItems = state.items.map((item) =>
    idSet.has(item.id)
      ? { ...item, status: 'забронировано' as const, bookingId: booking.id, needId: input.needId ?? item.needId }
      : item,
  );
  return { ok: true, state: { ...state, items: nextItems, bookings: [booking, ...state.bookings] } };
}

export function claimBooking(state: AppState, bookingId: string, volunteerId: string): OpResult {
  const booking = state.bookings.find((item) => item.id === bookingId);
  if (!booking || booking.status !== 'активна') return { ok: false, error: 'Бронь уже недоступна' };
  if (!state.volunteers.some((volunteer) => volunteer.id === volunteerId)) {
    return { ok: false, error: 'Волонтёр не найден' };
  }
  return {
    ok: true,
    state: {
      ...state,
      bookings: state.bookings.map((item) => (item.id === bookingId ? { ...item, volunteerId } : item)),
    },
  };
}

export function addNeed(state: AppState, need: Need): OpResult {
  if (!state.points.some((point) => point.id === need.pointId)) {
    return { ok: false, error: 'Выберите пункт помощи' };
  }
  if (!Number.isInteger(need.householdSize) || need.householdSize < 1 || need.householdSize > 12) {
    return { ok: false, error: 'Размер семьи — от 1 до 12' };
  }
  if (need.kids < 0 || need.elderly < 0 || need.kids + need.elderly > need.householdSize) {
    return { ok: false, error: 'Дети и пожилые не могут быть больше размера семьи' };
  }
  return { ok: true, state: { ...state, needs: [need, ...state.needs] } };
}

export function handoverItems(state: AppState, itemIds: string[], now: Date): OpResult {
  const unique = [...new Set(itemIds)];
  if (unique.length === 0) return { ok: false, error: 'Выберите хотя бы один товар' };
  const chosen = unique.map((id) => state.items.find((item) => item.id === id));
  if (chosen.some((item) => !item)) return { ok: false, error: 'Товар не найден' };
  const items = chosen as SurplusItem[];
  if (new Set(items.map((item) => item.storeId)).size !== 1) {
    return { ok: false, error: 'В одном акте только один магазин' };
  }
  if (items.some((item) => item.status !== 'доступно' && item.status !== 'забронировано')) {
    return { ok: false, error: 'Передать можно доступные или забронированные товары' };
  }
  const store = state.stores.find((item) => item.id === items[0].storeId);
  if (!store) return { ok: false, error: 'Магазин не найден' };
  const nowIso = now.toISOString();
  const idSet = new Set(unique);
  const nextItems = state.items.map((item) =>
    idSet.has(item.id)
      ? { ...item, status: 'передано' as const, bookingId: undefined, resolvedAt: nowIso }
      : item,
  );
  const bookingIds = new Set(items.map((item) => item.bookingId).filter((id): id is string => Boolean(id)));
  const nextBookings = state.bookings.map((booking) => {
    if (!bookingIds.has(booking.id) || booking.status !== 'активна') return booking;
    const stillOpen = nextItems.some((item) => item.bookingId === booking.id && item.status === 'забронировано');
    return stillOpen ? booking : { ...booking, status: 'выполнена' as const };
  });
  const volunteerIds = [
    ...new Set(
      items.map((item) => state.bookings.find((booking) => booking.id === item.bookingId)?.volunteerId ?? null),
    ),
  ];
  const needIds = [...new Set(items.map((item) => item.needId ?? null))];
  const volunteer =
    volunteerIds.length === 1 && volunteerIds[0]
      ? state.volunteers.find((item) => item.id === volunteerIds[0])
      : undefined;
  const need = needIds.length === 1 && needIds[0] ? state.needs.find((item) => item.id === needIds[0]) : undefined;
  const point = need ? state.points.find((item) => item.id === need.pointId) : undefined;
  const act: HandoverAct = {
    id: uid('act'),
    number: `ВП-${moscowDayKey(now).replace(/-/g, '')}-${String(state.acts.length + 1).padStart(3, '0')}`,
    storeId: store.id,
    storeName: store.name,
    storeAddress: store.address,
    volunteerLabel: volunteer?.callSign ?? 'Представитель фонда «Выручаем»',
    pointLabel: point ? `${point.name}, ${point.district}` : null,
    itemIds: unique,
    lines: items.map((item) => ({
      name: item.name,
      category: item.category,
      storage: item.storage,
      quantity: item.quantity,
      unit: item.unit,
      weightKg: item.weightKg,
      valueRub: item.valueRub,
      expiresAt: item.expiresAt,
    })),
    createdAt: nowIso,
    totalKg: round3(items.reduce((sum, item) => sum + item.weightKg, 0)),
    totalRub: Math.round(items.reduce((sum, item) => sum + item.valueRub, 0)),
  };
  return {
    ok: true,
    act,
    state: { ...state, items: nextItems, bookings: nextBookings, acts: [act, ...state.acts] },
  };
}

export function writeOffItems(state: AppState, itemIds: string[], now: Date): OpResult {
  const unique = [...new Set(itemIds)];
  if (unique.length === 0) return { ok: false, error: 'Выберите хотя бы один товар' };
  const chosen = unique.map((id) => state.items.find((item) => item.id === id));
  if (chosen.some((item) => !item)) return { ok: false, error: 'Товар не найден' };
  const items = chosen as SurplusItem[];
  if (items.some((item) => item.status !== 'доступно' && item.status !== 'забронировано')) {
    return { ok: false, error: 'Списать можно только то, что ещё на полке' };
  }
  const idSet = new Set(unique);
  const nowIso = now.toISOString();
  const bookingIds = new Set(items.map((item) => item.bookingId).filter((id): id is string => Boolean(id)));
  const nextItems = state.items.map((item) =>
    idSet.has(item.id) ? { ...item, status: 'списано' as const, bookingId: undefined, resolvedAt: nowIso } : item,
  );
  const nextBookings = state.bookings.map((booking) => {
    if (!bookingIds.has(booking.id) || booking.status !== 'активна') return booking;
    const stillOpen = nextItems.some((item) => item.bookingId === booking.id && item.status === 'забронировано');
    return stillOpen ? booking : { ...booking, status: 'истекла' as const };
  });
  return { ok: true, state: replaceItems({ ...state, bookings: nextBookings }, nextItems) };
}
