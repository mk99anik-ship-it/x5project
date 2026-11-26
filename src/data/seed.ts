import { CATALOG } from './catalog';
import { round3 } from '../lib/number';
import { firstFeasibleSlot } from '../lib/slots';
import { addHours, moscowDayKey, moscowIso, shiftDayKey } from '../lib/time';
import type {
  AppState,
  Booking,
  CatalogItem,
  HelpPoint,
  ItemStatus,
  Need,
  Priority,
  Restriction,
  Store,
  SurplusItem,
  Volunteer,
} from '../types';

const STORES: Store[] = [
  { id: 's12', name: 'Магазин №12', address: 'ул. Арбат, 12', district: 'Арбат', lat: 55.7522, lng: 37.5916, closesAt: '22:00' },
  { id: 's47', name: 'Магазин №47', address: 'Ленинский проспект, 47', district: 'Гагаринский', lat: 55.7072, lng: 37.5866, closesAt: '23:00' },
  { id: 's83', name: 'Магазин №83', address: 'ул. Пресненский Вал, 27', district: 'Пресненский', lat: 55.7708, lng: 37.5662, closesAt: '22:00' },
  { id: 's105', name: 'Магазин №105', address: 'ул. Профсоюзная, 104', district: 'Черёмушки', lat: 55.6544, lng: 37.5408, closesAt: '23:00' },
  { id: 's218', name: 'Магазин №218', address: 'Щёлковское шоссе, 75', district: 'Гольяново', lat: 55.8176, lng: 37.8034, closesAt: '22:00' },
  { id: 's341', name: 'Магазин №341', address: 'ул. Народного Ополчения, 42', district: 'Хорошёво-Мнёвники', lat: 55.7818, lng: 37.4786, closesAt: '22:00' },
];

const POINTS: HelpPoint[] = [
  { id: 'p-arbat', name: 'Пункт помощи «Арбат»', district: 'Арбат', address: 'ул. Арбат, 36', lat: 55.7494, lng: 37.5912 },
  { id: 'p-gagar', name: 'Пункт помощи «Гагаринский»', district: 'Гагаринский', address: 'Ленинский проспект, 68', lat: 55.6998, lng: 37.5688 },
  { id: 'p-presn', name: 'Пункт помощи «Пресня»', district: 'Пресненский', address: 'Большая Грузинская ул., 12', lat: 55.7694, lng: 37.5798 },
  { id: 'p-cher', name: 'Пункт помощи «Черёмушки»', district: 'Черёмушки', address: 'ул. Намёткина, 10', lat: 55.6648, lng: 37.5544 },
  { id: 'p-gol', name: 'Пункт помощи «Гольяново»', district: 'Гольяново', address: 'Уссурийская ул., 10', lat: 55.8214, lng: 37.8122 },
  { id: 'p-hor', name: 'Пункт помощи «Хорошёво»', district: 'Хорошёво-Мнёвники', address: 'ул. Маршала Жукова, 30', lat: 55.7766, lng: 37.4688 },
  { id: 'p-tver', name: 'Пункт помощи «Тверской»', district: 'Тверской', address: 'ул. Тверская, 18', lat: 55.7648, lng: 37.6054 },
];

const VOLUNTEERS: Volunteer[] = [
  { id: 'v1', callSign: 'Волонтёр А.', districts: ['Арбат', 'Пресненский', 'Тверской'] },
  { id: 'v2', callSign: 'Волонтёр Б.', districts: ['Гагаринский', 'Черёмушки'] },
  { id: 'v3', callSign: 'Волонтёр В.', districts: ['Гольяново'] },
  { id: 'v4', callSign: 'Волонтёр Г.', districts: ['Хорошёво-Мнёвники', 'Пресненский'] },
];

interface NeedSpec {
  id: string;
  pointId: string;
  size: number;
  kids: number;
  elderly: number;
  restrictions: Restriction[];
  priority: Priority;
  note: string;
  ageHours: number;
}

const NEED_SPECS: NeedSpec[] = [
  { id: 'need-01', pointId: 'p-arbat', size: 3, kids: 1, elderly: 0, restrictions: ['диабет'], priority: 'высокий', note: 'Нужны продукты с низкой долей сахара на сутки', ageHours: 5 },
  { id: 'need-02', pointId: 'p-arbat', size: 4, kids: 2, elderly: 0, restrictions: ['детское питание'], priority: 'срочный', note: 'В семье двое детей, нужно детское питание', ageHours: 2 },
  { id: 'need-03', pointId: 'p-gagar', size: 2, kids: 0, elderly: 1, restrictions: [], priority: 'обычный', note: 'Пожилой человек и взрослый, удобнее мягкие продукты', ageHours: 8 },
  { id: 'need-04', pointId: 'p-gagar', size: 5, kids: 2, elderly: 1, restrictions: ['без глютена'], priority: 'высокий', note: 'Без глютена на всю семью', ageHours: 6 },
  { id: 'need-05', pointId: 'p-presn', size: 3, kids: 1, elderly: 0, restrictions: [], priority: 'обычный', note: 'Продуктовый набор на сутки', ageHours: 10 },
  { id: 'need-06', pointId: 'p-presn', size: 1, kids: 0, elderly: 1, restrictions: ['диабет'], priority: 'срочный', note: 'Срочно: питание с ограничением по сахару', ageHours: 1 },
  { id: 'need-07', pointId: 'p-cher', size: 4, kids: 1, elderly: 0, restrictions: ['детское питание'], priority: 'высокий', note: 'Нужна детская каша и базовые продукты', ageHours: 4 },
  { id: 'need-08', pointId: 'p-cher', size: 2, kids: 0, elderly: 0, restrictions: ['без глютена'], priority: 'обычный', note: 'Только продукты без глютена', ageHours: 12 },
  { id: 'need-09', pointId: 'p-gol', size: 6, kids: 3, elderly: 1, restrictions: [], priority: 'срочный', note: 'Большая семья, приоритет у скоропорта', ageHours: 3 },
  { id: 'need-10', pointId: 'p-gol', size: 3, kids: 0, elderly: 2, restrictions: ['диабет'], priority: 'высокий', note: 'Двое пожилых, контроль сахара', ageHours: 9 },
  { id: 'need-11', pointId: 'p-hor', size: 4, kids: 2, elderly: 0, restrictions: ['без глютена', 'детское питание'], priority: 'срочный', note: 'Дети и безглютеновое питание', ageHours: 2 },
  { id: 'need-12', pointId: 'p-hor', size: 2, kids: 0, elderly: 0, restrictions: [], priority: 'обычный', note: 'Базовый набор на сутки', ageHours: 15 },
  { id: 'need-13', pointId: 'p-tver', size: 3, kids: 1, elderly: 1, restrictions: [], priority: 'высокий', note: 'Смешанный состав семьи', ageHours: 7 },
  { id: 'need-14', pointId: 'p-tver', size: 5, kids: 0, elderly: 2, restrictions: ['диабет', 'без глютена'], priority: 'срочный', note: 'Без глютена и без сладкого', ageHours: 1 },
  { id: 'need-15', pointId: 'p-gagar', size: 1, kids: 1, elderly: 0, restrictions: ['детское питание'], priority: 'высокий', note: 'Нужно детское питание на сутки', ageHours: 4 },
];

interface LiveSpec {
  catalogId: string;
  storeId: string;
  qty: number;
  hours: number;
  status: ItemStatus;
  volunteerId?: string | null;
  needId?: string;
}

const LIVE: LiveSpec[] = [
  { catalogId: 'salad', storeId: 's12', qty: 4, hours: 3.5, status: 'доступно' },
  { catalogId: 'milk', storeId: 's12', qty: 6, hours: 5, status: 'доступно' },
  { catalogId: 'kefir', storeId: 's12', qty: 4, hours: 10, status: 'доступно' },
  { catalogId: 'yogurt', storeId: 's12', qty: 8, hours: 16, status: 'доступно' },
  { catalogId: 'apples', storeId: 's12', qty: 2, hours: 20, status: 'забронировано', volunteerId: 'v1', needId: 'need-01' },
  { catalogId: 'butter', storeId: 's12', qty: 3, hours: 30, status: 'передано' },
  { catalogId: 'baton', storeId: 's12', qty: 2, hours: 7, status: 'списано' },
  { catalogId: 'eggs', storeId: 's12', qty: 3, hours: 40, status: 'доступно' },
  { catalogId: 'rice', storeId: 's12', qty: 4, hours: 120, status: 'доступно' },
  { catalogId: 'water', storeId: 's12', qty: 6, hours: 400, status: 'доступно' },
  { catalogId: 'mince', storeId: 's47', qty: 3, hours: 4, status: 'доступно' },
  { catalogId: 'chicken', storeId: 's47', qty: 2, hours: 12, status: 'доступно' },
  { catalogId: 'tvorog', storeId: 's47', qty: 6, hours: 14, status: 'доступно' },
  { catalogId: 'tomato', storeId: 's47', qty: 1, hours: 9, status: 'забронировано', volunteerId: null, needId: 'need-03' },
  { catalogId: 'formula', storeId: 's47', qty: 2, hours: 240, status: 'доступно' },
  { catalogId: 'puree', storeId: 's47', qty: 10, hours: 180, status: 'доступно' },
  { catalogId: 'juice', storeId: 's47', qty: 3, hours: 36, status: 'доступно' },
  { catalogId: 'cucumber', storeId: 's83', qty: 2, hours: 5.5, status: 'доступно' },
  { catalogId: 'cheese', storeId: 's83', qty: 2, hours: 22, status: 'забронировано', volunteerId: 'v1', needId: 'need-05' },
  { catalogId: 'smetana', storeId: 's83', qty: 4, hours: 11, status: 'доступно' },
  { catalogId: 'sausages', storeId: 's83', qty: 5, hours: 15, status: 'доступно' },
  { catalogId: 'pelmeni', storeId: 's83', qty: 2, hours: 90, status: 'доступно' },
  { catalogId: 'oil', storeId: 's83', qty: 2, hours: 500, status: 'доступно' },
  { catalogId: 'carrots', storeId: 's83', qty: 3, hours: 48, status: 'доступно' },
  { catalogId: 'porridge', storeId: 's105', qty: 4, hours: 100, status: 'забронировано', volunteerId: 'v2', needId: 'need-07' },
  { catalogId: 'potato', storeId: 's105', qty: 5, hours: 80, status: 'доступно' },
  { catalogId: 'cabbage', storeId: 's105', qty: 3, hours: 60, status: 'доступно' },
  { catalogId: 'pasta', storeId: 's105', qty: 4, hours: 200, status: 'доступно' },
  { catalogId: 'oats', storeId: 's105', qty: 3, hours: 160, status: 'доступно' },
  { catalogId: 'bananas', storeId: 's105', qty: 2, hours: 18, status: 'доступно' },
  { catalogId: 'millet', storeId: 's105', qty: 3, hours: 300, status: 'доступно' },
  { catalogId: 'yogurtSweet', storeId: 's105', qty: 6, hours: 20, status: 'доступно' },
  { catalogId: 'bread', storeId: 's218', qty: 4, hours: 4.5, status: 'доступно' },
  { catalogId: 'milk', storeId: 's218', qty: 5, hours: 8, status: 'доступно' },
  { catalogId: 'chicken', storeId: 's218', qty: 2, hours: 13, status: 'забронировано', volunteerId: 'v3', needId: 'need-09' },
  { catalogId: 'soup', storeId: 's218', qty: 4, hours: 5, status: 'доступно' },
  { catalogId: 'oil', storeId: 's218', qty: 2, hours: 480, status: 'доступно' },
  { catalogId: 'puree', storeId: 's218', qty: 8, hours: 70, status: 'доступно' },
  { catalogId: 'rye', storeId: 's218', qty: 3, hours: 9, status: 'доступно' },
  { catalogId: 'salad', storeId: 's341', qty: 3, hours: 2.5, status: 'доступно' },
  { catalogId: 'kefir', storeId: 's341', qty: 3, hours: 9, status: 'доступно' },
  { catalogId: 'apples', storeId: 's341', qty: 4, hours: 30, status: 'доступно' },
  { catalogId: 'vegmix', storeId: 's341', qty: 4, hours: 120, status: 'доступно' },
  { catalogId: 'cheese', storeId: 's341', qty: 2, hours: 24, status: 'доступно' },
  { catalogId: 'baton', storeId: 's341', qty: 5, hours: 7.5, status: 'доступно' },
  { catalogId: 'formula', storeId: 's341', qty: 2, hours: 220, status: 'доступно' },
];

const HIST_POOL = ['chicken', 'apples', 'milk', 'potato', 'rice', 'kefir', 'cabbage', 'cheese', 'carrots', 'oil', 'eggs', 'tomato'];
const LINKED_NEEDS = ['need-08', 'need-12', 'need-06', 'need-14', 'need-10', 'need-13'];

function catalogOf(id: string): CatalogItem {
  const found = CATALOG.find((item) => item.id === id);
  if (!found) throw new Error(`Нет товара ${id}`);
  return found;
}

function makeItem(
  id: string,
  catalog: CatalogItem,
  storeId: string,
  qty: number,
  expiresAt: string,
  addedAt: string,
  status: ItemStatus,
  extra: Partial<SurplusItem>,
): SurplusItem {
  return {
    id,
    storeId,
    catalogId: catalog.id,
    name: catalog.name,
    category: catalog.category,
    storage: catalog.storage,
    quantity: qty,
    unit: catalog.unit,
    weightKg: round3(catalog.unitKg * qty),
    valueRub: Math.round(catalog.priceRub * qty),
    expiresAt,
    addedAt,
    status,
    gluten: catalog.gluten,
    sugar: catalog.sugar,
    baby: catalog.baby,
    ...extra,
  };
}

export function buildDemo(now: Date): AppState {
  const items: SurplusItem[] = [];
  const bookings: Booking[] = [];
  let bookNumber = 1;

  LIVE.forEach((spec, index) => {
    const catalog = catalogOf(spec.catalogId);
    const id = `live-${String(index + 1).padStart(2, '0')}`;
    const expiresAt = addHours(now, spec.hours).toISOString();
    const addedAt = now.toISOString();
    let bookingId: string | undefined;
    if (spec.status === 'забронировано') {
      const slot = firstFeasibleSlot(now, expiresAt);
      if (!slot) throw new Error(`Нет слота для ${id}`);
      bookingId = `book-${String(bookNumber).padStart(2, '0')}`;
      bookNumber += 1;
      bookings.push({
        id: bookingId,
        itemIds: [id],
        storeId: spec.storeId,
        volunteerId: spec.volunteerId ?? null,
        needId: spec.needId ?? null,
        slotStart: slot.start,
        slotEnd: slot.end,
        slotLabel: slot.label,
        status: 'активна',
        createdAt: addedAt,
      });
    }
    const done = spec.status === 'передано' || spec.status === 'списано';
    items.push(
      makeItem(id, catalog, spec.storeId, spec.qty, expiresAt, addedAt, spec.status, {
        bookingId,
        needId: spec.needId,
        resolvedAt: done ? addedAt : undefined,
      }),
    );
  });

  const storeIds = STORES.map((store) => store.id);
  let linkCursor = 0;
  let histNumber = 1;
  for (let day = 1; day <= 14; day += 1) {
    for (let index = 0; index < 3; index += 1) {
      const catalog = catalogOf(HIST_POOL[(day * 2 + index) % HIST_POOL.length]);
      const storeId = storeIds[(day + index * 2) % storeIds.length];
      let qty = 2 + ((day + index) % 4);
      let needId: string | undefined;
      if (histNumber % 7 === 1 && linkCursor < LINKED_NEEDS.length) {
        needId = LINKED_NEEDS[linkCursor];
        linkCursor += 1;
        qty = 1;
      }
      const ymd = shiftDayKey(moscowDayKey(now), -day);
      const id = `hist-${String(histNumber).padStart(2, '0')}`;
      histNumber += 1;
      items.push(
        makeItem(id, catalog, storeId, qty, moscowIso(shiftDayKey(ymd, 1), 12, 0), moscowIso(ymd, 16, 30), 'передано', {
          resolvedAt: moscowIso(ymd, 19, 0),
          needId,
        }),
      );
    }
  }

  const needs: Need[] = NEED_SPECS.map((spec) => ({
    id: spec.id,
    pointId: spec.pointId,
    householdSize: spec.size,
    kids: spec.kids,
    elderly: spec.elderly,
    restrictions: spec.restrictions,
    priority: spec.priority,
    createdAt: addHours(now, -spec.ageHours).toISOString(),
    note: spec.note,
  }));

  return {
    version: 1,
    seededAt: now.toISOString(),
    stores: STORES,
    points: POINTS,
    catalog: CATALOG,
    volunteers: VOLUNTEERS,
    items,
    needs,
    bookings,
    acts: [],
    selectedStoreId: 's12',
    selectedVolunteerId: 'v1',
  };
}
