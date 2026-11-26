import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { buildDemo } from '../data/seed';
import { uid } from '../lib/id';
import {
  addNeed,
  addSurplus,
  bookItems,
  claimBooking,
  expireState,
  handoverItems,
  writeOffItems,
  type AddInput,
  type BookInput,
} from '../lib/operations';
import { moscowDayKey } from '../lib/time';
import type { AppState, HandoverAct, Need } from '../types';

const STORAGE_KEY = 'vechernyaya-polka-v1';

function load(): AppState {
  const now = new Date();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return buildDemo(now);
    const parsed = JSON.parse(raw) as AppState;
    if (
      !parsed ||
      parsed.version !== 1 ||
      !Array.isArray(parsed.items) ||
      !Array.isArray(parsed.needs) ||
      !Array.isArray(parsed.stores) ||
      !parsed.stores.some((store) => store.id === parsed.selectedStoreId)
    ) {
      return buildDemo(now);
    }
    if (moscowDayKey(parsed.seededAt) !== moscowDayKey(now)) return buildDemo(now);
    return expireState(parsed, now);
  } catch {
    return buildDemo(now);
  }
}

interface AppApi {
  state: AppState;
  toast: string | null;
  dismissToast: () => void;
  reset: () => void;
  setStore: (storeId: string) => void;
  setVolunteer: (volunteerId: string) => void;
  addItem: (input: Omit<AddInput, 'now'>) => boolean;
  book: (input: Omit<BookInput, 'now'>) => boolean;
  claim: (bookingId: string) => boolean;
  createNeed: (input: Omit<Need, 'id' | 'createdAt'>) => string | null;
  handover: (itemIds: string[]) => HandoverAct | null;
  writeOff: (itemIds: string[]) => boolean;
}

const AppContext = createContext<AppApi | null>(null);

export function StateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(load);
  const [toast, setToast] = useState<string | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const commit = (next: AppState) => {
    stateRef.current = next;
    setState(next);
  };

  const notify = (message: string) => setToast(message);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      setToast('Не удалось сохранить демо в этом браузере');
    }
  }, [state]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 3400);
    return () => window.clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const now = new Date();
      const prev = stateRef.current;
      const next =
        moscowDayKey(prev.seededAt) !== moscowDayKey(now) ? buildDemo(now) : expireState(prev, now);
      commit(next);
    }, 60_000);
    return () => window.clearInterval(id);
  }, []);

  const api: AppApi = {
    state,
    toast,
    dismissToast: () => setToast(null),
    reset: () => {
      commit(buildDemo(new Date()));
      notify('Демо-данные обновлены');
    },
    setStore: (storeId) => {
      if (!stateRef.current.stores.some((store) => store.id === storeId)) return;
      commit({ ...stateRef.current, selectedStoreId: storeId });
    },
    setVolunteer: (volunteerId) => {
      if (!stateRef.current.volunteers.some((volunteer) => volunteer.id === volunteerId)) return;
      commit({ ...stateRef.current, selectedVolunteerId: volunteerId });
    },
    addItem: (input) => {
      const result = addSurplus(stateRef.current, { ...input, now: new Date() });
      if (!result.ok) {
        notify(result.error);
        return false;
      }
      commit(result.state);
      notify(`${result.state.items[0]?.name ?? 'Товар'} на полке`);
      return true;
    },
    book: (input) => {
      const result = bookItems(stateRef.current, { ...input, now: new Date() });
      if (!result.ok) {
        notify(result.error);
        return false;
      }
      commit(result.state);
      notify(input.volunteerId ? 'Забор забронирован' : 'Товар зарезервирован под нужду');
      return true;
    },
    claim: (bookingId) => {
      const result = claimBooking(stateRef.current, bookingId, stateRef.current.selectedVolunteerId);
      if (!result.ok) {
        notify(result.error);
        return false;
      }
      commit(result.state);
      notify('Бронь в вашем маршруте');
      return true;
    },
    createNeed: (input) => {
      const need: Need = { ...input, id: uid('need'), createdAt: new Date().toISOString() };
      const result = addNeed(stateRef.current, need);
      if (!result.ok) {
        notify(result.error);
        return null;
      }
      commit(result.state);
      notify('Нужда записана, ниже подходящие продукты');
      return need.id;
    },
    handover: (itemIds) => {
      const result = handoverItems(stateRef.current, itemIds, new Date());
      if (!result.ok || !result.act) {
        notify(result.ok ? 'Не удалось оформить акт' : result.error);
        return null;
      }
      commit(result.state);
      notify(`Акт ${result.act.number} сформирован`);
      return result.act;
    },
    writeOff: (itemIds) => {
      const result = writeOffItems(stateRef.current, itemIds, new Date());
      if (!result.ok) {
        notify(result.error);
        return false;
      }
      commit(result.state);
      notify('Позиции списаны');
      return true;
    },
  };

  return <AppContext.Provider value={api}>{children}</AppContext.Provider>;
}

export function useApp(): AppApi {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('Нет состояния приложения');
  return ctx;
}

export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}
