export type Category =
  | 'молочные'
  | 'хлеб'
  | 'овощи и фрукты'
  | 'мясо и птица'
  | 'бакалея'
  | 'детское питание'
  | 'готовая еда'
  | 'напитки'
  | 'заморозка'
  | 'яйца';

export type Storage = 'холод' | 'сухое' | 'заморозка';

export type Unit = 'кг' | 'шт' | 'л' | 'уп';

export type ItemStatus = 'доступно' | 'забронировано' | 'передано' | 'списано';

export type Sugar = 'низкий' | 'средний' | 'высокий';

export type Restriction = 'без глютена' | 'детское питание' | 'диабет';

export type Priority = 'обычный' | 'высокий' | 'срочный';

export type BookingStatus = 'активна' | 'выполнена' | 'истекла';

export interface Store {
  id: string;
  name: string;
  address: string;
  district: string;
  lat: number;
  lng: number;
  closesAt: string;
}

export interface HelpPoint {
  id: string;
  name: string;
  district: string;
  address: string;
  lat: number;
  lng: number;
}

export interface CatalogItem {
  id: string;
  name: string;
  category: Category;
  storage: Storage;
  unit: Unit;
  unitKg: number;
  priceRub: number;
  barcode: string;
  gluten: boolean;
  sugar: Sugar;
  baby: boolean;
}

export interface SurplusItem {
  id: string;
  storeId: string;
  catalogId: string;
  name: string;
  category: Category;
  storage: Storage;
  quantity: number;
  unit: Unit;
  weightKg: number;
  valueRub: number;
  expiresAt: string;
  addedAt: string;
  resolvedAt?: string;
  status: ItemStatus;
  gluten: boolean;
  sugar: Sugar;
  baby: boolean;
  bookingId?: string;
  needId?: string;
}

export interface Volunteer {
  id: string;
  callSign: string;
  districts: string[];
}

export interface Need {
  id: string;
  pointId: string;
  householdSize: number;
  kids: number;
  elderly: number;
  restrictions: Restriction[];
  priority: Priority;
  createdAt: string;
  note: string;
}

export interface Booking {
  id: string;
  itemIds: string[];
  storeId: string;
  volunteerId: string | null;
  needId: string | null;
  slotStart: string;
  slotEnd: string;
  slotLabel: string;
  status: BookingStatus;
  createdAt: string;
}

export interface ActLine {
  name: string;
  category: Category;
  storage: Storage;
  quantity: number;
  unit: Unit;
  weightKg: number;
  valueRub: number;
  expiresAt: string;
}

export interface HandoverAct {
  id: string;
  number: string;
  storeId: string;
  storeName: string;
  storeAddress: string;
  volunteerLabel: string;
  pointLabel: string | null;
  itemIds: string[];
  lines: ActLine[];
  createdAt: string;
  totalKg: number;
  totalRub: number;
}

export interface AppState {
  version: 1;
  seededAt: string;
  stores: Store[];
  points: HelpPoint[];
  catalog: CatalogItem[];
  volunteers: Volunteer[];
  items: SurplusItem[];
  needs: Need[];
  bookings: Booking[];
  acts: HandoverAct[];
  selectedStoreId: string;
  selectedVolunteerId: string;
}

export const CATEGORIES: Category[] = [
  'молочные',
  'хлеб',
  'овощи и фрукты',
  'мясо и птица',
  'бакалея',
  'детское питание',
  'готовая еда',
  'напитки',
  'заморозка',
  'яйца',
];

export const RESTRICTIONS: Restriction[] = ['без глютена', 'детское питание', 'диабет'];

export const PRIORITIES: Priority[] = ['обычный', 'высокий', 'срочный'];

export const ITEM_STATUSES: ItemStatus[] = ['доступно', 'забронировано', 'передано', 'списано'];
