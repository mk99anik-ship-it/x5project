import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EmptyNote, PageIntro, StatusPill } from '../components/Ui';
import { formatKg, formatRub, plural } from '../lib/format';
import { isOnTodayShelf } from '../lib/metrics';
import { formatHoursLeft, formatMoscow, hoursBetween, parseMoscowInput, presetExpiry, presetLabel, type ExpiryPreset } from '../lib/time';
import { useApp, useNow } from '../state/store';
import type { CatalogItem, ItemStatus } from '../types';

const PRESET_IDS: ExpiryPreset[] = ['tonight', 'tomorrow', 'twodays'];

export function StorePage() {
  const { state, setStore, addItem, handover, writeOff } = useApp();
  const now = useNow();
  const navigate = useNavigate();
  const shelfRef = useRef<HTMLElement>(null);
  const handoverRef = useRef<HTMLDialogElement>(null);
  const writeoffRef = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('все');
  const [preset, setPreset] = useState<ExpiryPreset>('tonight');
  const [custom, setCustom] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [statusFilter, setStatusFilter] = useState<'все' | ItemStatus>('все');
  const [picked, setPicked] = useState<string[]>([]);

  const store = state.stores.find((item) => item.id === state.selectedStoreId) ?? state.stores[0];
  const categories = ['все', ...new Set(state.catalog.map((item) => item.category))];

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.catalog
      .filter((item) => category === 'все' || item.category === category)
      .filter((item) => !q || item.name.toLowerCase().includes(q) || item.barcode.includes(query.trim()))
      .slice(0, 8);
  }, [category, query, state.catalog]);

  const shelf = useMemo(() => {
    const rank: Record<ItemStatus, number> = { доступно: 0, забронировано: 1, передано: 2, списано: 3 };
    return state.items
      .filter((item) => item.storeId === store.id && isOnTodayShelf(item, now))
      .filter((item) => statusFilter === 'все' || item.status === statusFilter)
      .slice()
      .sort((a, b) => rank[a.status] - rank[b.status] || new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime());
  }, [now, state.items, statusFilter, store.id]);

  const selectedItems = state.items.filter((item) => picked.includes(item.id));
  const actionable = selectedItems.filter((item) => item.status === 'доступно' || item.status === 'забронировано');

  function expiryIso(): string | null {
    if (custom) return parseMoscowInput(custom);
    return presetExpiry(now, preset);
  }

  function publish(item: CatalogItem, qty: number) {
    const expiresAt = expiryIso() ?? new Date(0).toISOString();
    const ok = addItem({ storeId: store.id, catalogId: item.id, quantity: qty, expiresAt });
    if (!ok) return;
    setQuery('');
    setPicked([]);
    shelfRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function toggle(id: string) {
    setPicked((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }

  return (
    <div className="stack">
      <PageIntro
        eyebrow="Сотрудник магазина"
        title="Вечерняя полка за десять секунд"
        text="Найдите товар или введите штрихкод и нажмите Enter. Количество и срок уже подставлены, их можно поправить до отправки."
      />

      <div className="choice-row" role="radiogroup" aria-label="Магазин">
        {state.stores.map((item) => (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={item.id === store.id}
            className={item.id === store.id ? 'chip is-on' : 'chip'}
            onClick={() => {
              setStore(item.id);
              setPicked([]);
            }}
          >
            {item.name}
          </button>
        ))}
      </div>
      <p className="fine">
        {store.address}, {store.district}. Закрытие {store.closesAt}. Время сроков — московское.
      </p>

      <section className="panel">
        <div className="panel-head">
          <h2>Добавить на полку</h2>
        </div>
        <label className="field">
          <span>Поиск или штрихкод</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return;
              event.preventDefault();
              const exact = state.catalog.find((item) => item.barcode === query.trim() || item.name.toLowerCase() === query.trim().toLowerCase());
              const target = exact ?? (results.length === 1 ? results[0] : null);
              if (target) publish(target, quantity);
            }}
            placeholder="Молоко или 4607000000018"
            autoComplete="off"
            enterKeyHint="done"
          />
        </label>
        <div className="choice-row" aria-label="Категория каталога">
          {categories.map((item) => (
            <button key={item} type="button" className={item === category ? 'chip is-on' : 'chip'} onClick={() => setCategory(item)}>
              {item}
            </button>
          ))}
        </div>
        <div className="add-controls">
          <div className="stepper">
            <button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} aria-label="Меньше">
              −
            </button>
            <label>
              <span className="sr-only">Количество</span>
              <input
                type="number"
                min={1}
                max={99}
                value={quantity}
                onChange={(event) => setQuantity(Math.min(99, Math.max(1, Number(event.target.value) || 1)))}
              />
            </label>
            <button type="button" onClick={() => setQuantity((value) => Math.min(99, value + 1))} aria-label="Больше">
              +
            </button>
          </div>
          <div className="choice-row">
            {PRESET_IDS.map((item) => (
              <button
                key={item}
                type="button"
                className={!custom && preset === item ? 'chip is-on' : 'chip'}
                onClick={() => {
                  setPreset(item);
                  setCustom('');
                }}
              >
                {presetLabel(now, item)}
              </button>
            ))}
          </div>
          <label className="field field-compact">
            <span>Свой срок</span>
            <input
              type="datetime-local"
              value={custom}
              onChange={(event) => setCustom(event.target.value)}
            />
          </label>
        </div>
        {results.length === 0 ? (
          <EmptyNote>В каталоге нет такого товара. Проверьте штрихкод или выберите категорию.</EmptyNote>
        ) : (
          <ul className="catalog-list">
            {results.map((item) => (
              <li key={item.id}>
                <div>
                  <strong>{item.name}</strong>
                  <p>
                    {item.category} · {item.storage} · {formatKg(item.unitKg)} · {formatRub(item.priceRub)}
                  </p>
                  <p className="fine">Штрихкод {item.barcode}</p>
                </div>
                <button type="button" className="btn" onClick={() => publish(item, quantity)}>
                  На полку
                </button>
              </li>
            ))}
          </ul>
        )}
        <details className="hint">
          <summary>Штрихкоды для проверки</summary>
          <ul>
            {state.catalog.slice(0, 6).map((item) => (
              <li key={item.id}>
                {item.barcode} — {item.name}
              </li>
            ))}
          </ul>
        </details>
      </section>

      <section className="panel" ref={shelfRef}>
        <div className="panel-head">
          <h2>Сегодня на полке</h2>
          <p>
            {shelf.length} {plural(shelf.length, 'позиция', 'позиции', 'позиций')}
          </p>
        </div>
        <div className="choice-row" aria-label="Статус">
          {(['все', 'доступно', 'забронировано', 'передано', 'списано'] as const).map((item) => (
            <button key={item} type="button" className={statusFilter === item ? 'chip is-on' : 'chip'} onClick={() => setStatusFilter(item)}>
              {item}
            </button>
          ))}
        </div>
        {shelf.length === 0 ? (
          <EmptyNote>На полке этого магазина пока пусто. Добавьте первый товар выше.</EmptyNote>
        ) : (
          <ul className="shelf-list">
            {shelf.map((item) => {
              const hours = hoursBetween(now, new Date(item.expiresAt));
              const canPick = item.status === 'доступно' || item.status === 'забронировано';
              return (
                <li key={item.id}>
                  {canPick ? (
                    <input
                      type="checkbox"
                      checked={picked.includes(item.id)}
                      onChange={() => toggle(item.id)}
                      aria-label={`Выбрать ${item.name}`}
                    />
                  ) : (
                    <span className="check-spacer" aria-hidden="true" />
                  )}
                  <div>
                    <strong>{item.name}</strong>
                    <p>
                      {item.quantity} {item.unit} · {formatKg(item.weightKg)} · {item.category} · {item.storage}
                    </p>
                    <p className="fine">
                      Годен до {formatMoscow(item.expiresAt)}
                      {hours > 0 ? ` · осталось ${formatHoursLeft(hours)}` : ''}
                    </p>
                  </div>
                  <StatusPill status={item.status} />
                </li>
              );
            })}
          </ul>
        )}
        <div className="action-row">
          <button type="button" className="btn" disabled={actionable.length === 0} onClick={() => handoverRef.current?.showModal()}>
            Передать выбранное
          </button>
          <button type="button" className="btn btn-ghost" disabled={actionable.length === 0} onClick={() => writeoffRef.current?.showModal()}>
            Списать
          </button>
        </div>
      </section>

      <dialog ref={handoverRef} className="modal" aria-labelledby="handover-title">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const act = handover(actionable.map((item) => item.id));
            handoverRef.current?.close();
            setPicked([]);
            if (act) navigate(`/akt/${act.id}`);
          }}
        >
          <h2 id="handover-title">Подтвердить передачу</h2>
          <p>
            {actionable.length} {plural(actionable.length, 'позиция', 'позиции', 'позиций')},{' '}
            {formatKg(actionable.reduce((sum, item) => sum + item.weightKg, 0))}. Будет сформирован акт для фонда «Выручаем».
          </p>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={() => handoverRef.current?.close()}>
              Отмена
            </button>
            <button type="submit" className="btn">
              Подтвердить и открыть акт
            </button>
          </div>
        </form>
      </dialog>

      <dialog ref={writeoffRef} className="modal" aria-labelledby="writeoff-title">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            writeOff(actionable.map((item) => item.id));
            writeoffRef.current?.close();
            setPicked([]);
          }}
        >
          <h2 id="writeoff-title">Списать выбранное?</h2>
          <p>Эти позиции уйдут со свободной полки и не попадут в маршрут волонтёра.</p>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={() => writeoffRef.current?.close()}>
              Отмена
            </button>
            <button type="submit" className="btn btn-danger">
              Списать
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
