import { lazy, Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MapBoundary } from '../components/MapBoundary';
import { EmptyNote, PageIntro, StatusPill } from '../components/Ui';
import { formatKg, plural } from '../lib/format';
import { distanceKm, formatKm } from '../lib/geo';
import { formatHoursLeft, hoursBetween, moscowDayEnd } from '../lib/time';
import { firstFeasibleSlot, slotFitsExpiry, upcomingSlots } from '../lib/slots';
import { useApp, useNow } from '../state/store';
import type { Category } from '../types';

const StoreMap = lazy(() => import('../components/StoreMap'));

export function VolunteerPage() {
  const { state, setVolunteer, book, claim } = useApp();
  const now = useNow();
  const [params, setParams] = useSearchParams();
  const initialStore = params.get('store') ?? 'все';
  const [district, setDistrict] = useState('все');
  const [category, setCategory] = useState<'все' | Category>('все');
  const [soon, setSoon] = useState(false);
  const [storeId, setStoreId] = useState(initialStore);
  const [picked, setPicked] = useState<string[]>([]);
  const [slotLabel, setSlotLabel] = useState('');
  const [needId, setNeedId] = useState('');

  const volunteer = state.volunteers.find((item) => item.id === state.selectedVolunteerId) ?? state.volunteers[0];
  const districts = ['все', ...state.stores.map((store) => store.district)];
  const categories = ['все', ...new Set(state.items.map((item) => item.category))];
  const dayEnd = moscowDayEnd(now).getTime();

  const available = useMemo(() => {
    return state.items
      .filter((item) => item.status === 'доступно')
      .filter((item) => {
        const store = state.stores.find((entry) => entry.id === item.storeId);
        if (!store) return false;
        if (district !== 'все' && store.district !== district) return false;
        if (storeId !== 'все' && store.id !== storeId) return false;
        if (category !== 'все' && item.category !== category) return false;
        if (soon && new Date(item.expiresAt).getTime() > dayEnd) return false;
        return hoursBetween(now, new Date(item.expiresAt)) > 0;
      })
      .slice()
      .sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime());
  }, [category, dayEnd, district, now, soon, state.items, state.stores, storeId]);

  const pickedItems = state.items.filter((item) => picked.includes(item.id));
  const pickedStore = pickedItems[0] ? state.stores.find((store) => store.id === pickedItems[0].storeId) : undefined;
  const earliestExpiry = pickedItems.reduce((min, item) => Math.min(min, new Date(item.expiresAt).getTime()), Number.POSITIVE_INFINITY);
  const standardSlots = upcomingSlots(now, 6).filter((slot) =>
    pickedItems.length === 0 ? true : slotFitsExpiry(slot, new Date(earliestExpiry).toISOString()),
  );
  const quickSlot =
    pickedItems.length > 0 && standardSlots.length === 0
      ? firstFeasibleSlot(now, new Date(earliestExpiry).toISOString())
      : null;
  const slots = quickSlot ? [quickSlot, ...standardSlots] : standardSlots;
  const activeSlot = slots.find((slot) => slot.label === slotLabel) ?? slots[0];

  const myRoute = state.bookings
    .filter((booking) => booking.status === 'активна' && booking.volunteerId === volunteer.id)
    .slice()
    .sort((a, b) => new Date(a.slotStart).getTime() - new Date(b.slotStart).getTime());
  const pool = state.bookings
    .filter((booking) => booking.status === 'активна' && !booking.volunteerId)
    .slice()
    .sort((a, b) => new Date(a.slotStart).getTime() - new Date(b.slotStart).getTime());

  function chooseStore(id: string) {
    setStoreId(id);
    setPicked([]);
    const next = new URLSearchParams(params);
    next.set('store', id);
    setParams(next);
  }

  function toggle(id: string) {
    const item = state.items.find((entry) => entry.id === id);
    if (!item) return;
    if (pickedItems.length > 0 && item.storeId !== pickedItems[0].storeId) {
      setPicked([id]);
      return;
    }
    setPicked((prev) => (prev.includes(id) ? prev.filter((entry) => entry !== id) : [...prev, id]));
  }

  return (
    <div className="stack">
      <PageIntro
        eyebrow="Волонтёр / фонд"
        title="Забрать, пока срок не вышел"
        text="На карте магазины с доступным остатком. Красная точка значит: есть товар без брони, который истекает в ближайшие 6 часов. Синие точки — пункты помощи."
      />

      <label className="field field-inline">
        <span>Кто забирает</span>
        <select value={volunteer.id} onChange={(event) => setVolunteer(event.target.value)}>
          {state.volunteers.map((item) => (
            <option key={item.id} value={item.id}>
              {item.callSign} · {item.districts.join(', ')}
            </option>
          ))}
        </select>
      </label>

      <div className="split">
        <div className="stack">
          <section className="panel">
            <div className="filters">
              <label className="field">
                <span>Район</span>
                <select
                  value={district}
                  onChange={(event) => {
                    setDistrict(event.target.value);
                    setPicked([]);
                  }}
                >
                  {districts.map((item) => (
                    <option key={item} value={item}>
                      {item === 'все' ? 'Все районы' : item}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Категория</span>
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value as 'все' | Category)}
                >
                  {categories.map((item) => (
                    <option key={item} value={item}>
                      {item === 'все' ? 'Все категории' : item}
                    </option>
                  ))}
                </select>
              </label>
              <label className="switch">
                <input type="checkbox" checked={soon} onChange={(event) => setSoon(event.target.checked)} />
                <span>Скоропорт сегодня</span>
              </label>
            </div>
            <p className="fine">
              {available.length} {plural(available.length, 'свободная позиция', 'свободные позиции', 'свободных позиций')}
            </p>
            {available.length === 0 ? (
              <EmptyNote>По этим фильтрам свободных товаров нет. Снимите «скоропорт» или смените район.</EmptyNote>
            ) : (
              <ul className="shelf-list scroll-pane">
                {available.map((item) => {
                  const itemStore = state.stores.find((entry) => entry.id === item.storeId);
                  const hours = hoursBetween(now, new Date(item.expiresAt));
                  return (
                    <li key={item.id}>
                      <input
                        type="checkbox"
                        checked={picked.includes(item.id)}
                        onChange={() => toggle(item.id)}
                        aria-label={`Взять ${item.name}`}
                      />
                      <div>
                        <strong>{item.name}</strong>
                        <p>
                          {itemStore?.name} · {itemStore?.district} · {formatKg(item.weightKg)} · {item.storage}
                        </p>
                        <p className={hours <= 6 ? 'fine is-hot' : 'fine'}>
                          Осталось {formatHoursLeft(hours)} · {item.category}
                        </p>
                      </div>
                      <StatusPill status={item.status} />
                    </li>
                  );
                })}
              </ul>
            )}
            {picked.length > 0 && pickedStore ? (
              <div className="bookbar">
                <div>
                  <strong>
                    {picked.length} {plural(picked.length, 'позиция', 'позиции', 'позиций')} · {pickedStore.name}
                  </strong>
                  <p className="fine">{formatKg(pickedItems.reduce((sum, item) => sum + item.weightKg, 0))}</p>
                </div>
                <label className="field">
                  <span>Слот</span>
                  <select value={activeSlot?.label ?? ''} onChange={(event) => setSlotLabel(event.target.value)}>
                    {slots.length === 0 ? <option value="">Нет слота до конца срока</option> : null}
                    {slots.map((slot) => (
                      <option key={slot.start} value={slot.label}>
                        {slot.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Под нужду</span>
                  <select value={needId} onChange={(event) => setNeedId(event.target.value)}>
                    <option value="">Без привязки</option>
                    {state.needs.map((need) => {
                      const point = state.points.find((item) => item.id === need.pointId);
                      return (
                        <option key={need.id} value={need.id}>
                          {point?.name} · {need.priority}
                        </option>
                      );
                    })}
                  </select>
                </label>
                <button
                  type="button"
                  className="btn"
                  disabled={!activeSlot}
                  onClick={() => {
                    if (!activeSlot) return;
                    const ok = book({
                      itemIds: picked,
                      volunteerId: volunteer.id,
                      needId: needId || null,
                      slotStart: activeSlot.start,
                      slotEnd: activeSlot.end,
                      slotLabel: activeSlot.label,
                    });
                    if (ok) {
                      setPicked([]);
                      setNeedId('');
                    }
                  }}
                >
                  Забронировать забор
                </button>
              </div>
            ) : null}
          </section>
        </div>

        <div className="stack">
          <section className="panel map-panel">
            <h2>Магазины и пункты</h2>
            <MapBoundary>
              <Suspense fallback={<p className="map-fallback">Загружаем карту…</p>}>
                <div className="map-frame">
                  <StoreMap
                    stores={state.stores}
                    points={state.points}
                    items={state.items}
                    now={now}
                    activeStoreId={storeId === 'все' ? undefined : storeId}
                    onStore={chooseStore}
                  />
                </div>
              </Suspense>
            </MapBoundary>
            <p className="fine">Колёсико мыши листает страницу. Масштаб — кнопками карты.</p>
          </section>

          <section className="panel">
            <h2>Мой маршрут на сегодня</h2>
            {myRoute.length === 0 ? (
              <EmptyNote>У {volunteer.callSign} пока нет активных заборов. Возьмите свободную бронь или соберите новую.</EmptyNote>
            ) : (
              <ol className="route">
                {myRoute.map((booking) => {
                  const bookingStore = state.stores.find((item) => item.id === booking.storeId);
                  const lines = state.items.filter((item) => booking.itemIds.includes(item.id));
                  const point = state.points.find((item) => item.id === state.needs.find((need) => need.id === booking.needId)?.pointId);
                  const km = bookingStore && point ? distanceKm(bookingStore.lat, bookingStore.lng, point.lat, point.lng) : null;
                  return (
                    <li key={booking.id}>
                      <strong>{booking.slotLabel}</strong>
                      <p>
                        {bookingStore?.name}, {bookingStore?.address}
                      </p>
                      <p>{lines.map((item) => item.name).join(', ')}</p>
                      <p className="fine">
                        {formatKg(lines.reduce((sum, item) => sum + item.weightKg, 0))}
                        {point ? ` · для ${point.name}` : ''}
                        {km !== null ? ` · ${formatKm(km)} до пункта` : ''}
                      </p>
                    </li>
                  );
                })}
              </ol>
            )}
            {pool.length > 0 ? (
              <>
                <h3>Ждёт волонтёра</h3>
                <ul className="route pool">
                  {pool.map((booking) => {
                    const bookingStore = state.stores.find((item) => item.id === booking.storeId);
                    const lines = state.items.filter((item) => booking.itemIds.includes(item.id));
                    return (
                      <li key={booking.id}>
                        <div>
                          <strong>
                            {bookingStore?.name} · {booking.slotLabel}
                          </strong>
                          <p>{lines.map((item) => item.name).join(', ')}</p>
                        </div>
                        <button type="button" className="btn btn-small" onClick={() => claim(booking.id)}>
                          Взять в маршрут
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}
