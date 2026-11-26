import { useMemo, useState } from 'react';
import { EmptyNote, PageIntro, PriorityPill } from '../components/Ui';
import { formatKg } from '../lib/format';
import { formatKm } from '../lib/geo';
import { suggestMatches } from '../lib/matching';
import { coverages, needDailyKg } from '../lib/metrics';
import { firstFeasibleSlot, upcomingSlots } from '../lib/slots';
import { formatHoursLeft } from '../lib/time';
import { useApp, useNow } from '../state/store';
import type { Priority, Restriction } from '../types';
import { PRIORITIES, RESTRICTIONS } from '../types';

export function NeedsPage() {
  const { state, createNeed, book } = useApp();
  const now = useNow();
  const [pointId, setPointId] = useState(state.points[0]?.id ?? '');
  const [householdSize, setHouseholdSize] = useState(3);
  const [kids, setKids] = useState(1);
  const [elderly, setElderly] = useState(0);
  const [restrictions, setRestrictions] = useState<Restriction[]>([]);
  const [priority, setPriority] = useState<Priority>('высокий');
  const [note, setNote] = useState('Продуктовая поддержка на сутки');
  const [activeId, setActiveId] = useState(state.needs[0]?.id ?? '');

  const rows = useMemo(() => coverages(state.needs, state.items), [state.items, state.needs]);
  const active = state.needs.find((need) => need.id === activeId) ?? state.needs[0];
  const point = state.points.find((item) => item.id === active?.pointId);
  const suggestions =
    active && point ? suggestMatches(active, point, state.items, state.stores, now, 8) : [];

  function toggleRestriction(value: Restriction) {
    setRestrictions((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]));
  }

  return (
    <div className="stack">
      <PageIntro
        eyebrow="Соцработник / пункт помощи"
        title="Сначала нужда, потом продукты"
        text="Опишите состав семьи и ограничения. Сервис предложит свободные товары и коротко объяснит оценку: соответствие, срок, расстояние, приоритет и объём."
      />
      <div className="split">
        <div className="stack">
          <form
            className="panel form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              const id = createNeed({ pointId, householdSize, kids, elderly, restrictions, priority, note: note.trim() });
              if (id) setActiveId(id);
            }}
          >
            <h2>Новая нужда</h2>
            <label className="field">
              <span>Пункт помощи</span>
              <select value={pointId} onChange={(event) => setPointId(event.target.value)}>
                {state.points.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · {item.district}
                  </option>
                ))}
              </select>
            </label>
            <div className="trio">
              <NumberField label="Человек в семье" value={householdSize} min={1} max={12} onChange={setHouseholdSize} />
              <NumberField label="Из них детей" value={kids} min={0} max={12} onChange={setKids} />
              <NumberField label="Из них пожилых" value={elderly} min={0} max={12} onChange={setElderly} />
            </div>
            <fieldset>
              <legend>Ограничения</legend>
              <div className="choice-row">
                {RESTRICTIONS.map((item) => (
                  <label key={item} className={restrictions.includes(item) ? 'chip is-on' : 'chip'}>
                    <input
                      type="checkbox"
                      checked={restrictions.includes(item)}
                      onChange={() => toggleRestriction(item)}
                    />
                    {item}
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="field">
              <span>Приоритет</span>
              <select value={priority} onChange={(event) => setPriority(event.target.value as Priority)}>
                {PRIORITIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Комментарий без персональных данных</span>
              <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} maxLength={240} />
            </label>
            <button type="submit" className="btn">
              Записать нужду и подобрать
            </button>
          </form>

          <section className="panel">
            <h2>Заявки пунктов</h2>
            <ul className="need-list">
              {state.needs.map((need) => {
                const needPoint = state.points.find((item) => item.id === need.pointId);
                const coverage = rows.find((row) => row.needId === need.id);
                const status = coverage?.closed ? 'закрыта' : coverage?.partial ? 'частично' : 'открыта';
                return (
                  <li key={need.id}>
                    <button type="button" className={need.id === active?.id ? 'need-btn is-on' : 'need-btn'} onClick={() => setActiveId(need.id)}>
                      <span>
                        <strong>{needPoint?.name}</strong>
                        <small>
                          {need.householdSize} чел. · детей {need.kids} · пожилых {need.elderly}
                          {need.restrictions.length ? ` · ${need.restrictions.join(', ')}` : ''}
                        </small>
                      </span>
                      <span className="need-meta">
                        <PriorityPill priority={need.priority} />
                        <em>{status}</em>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        <section className="panel">
          <div className="panel-head">
            <h2>Подходящие продукты</h2>
            {active && point ? (
              <p>
                {point.name}: суточная норма {formatKg(needDailyKg(active))}
              </p>
            ) : null}
          </div>
          {active ? <p className="fine">{active.note}</p> : null}
          {suggestions.length === 0 ? (
            <EmptyNote>Свободных продуктов под эти ограничения сейчас нет. Посмотрите соседние категории после новой поставки на полку.</EmptyNote>
          ) : (
            <ul className="match-list">
              {suggestions.map((suggestion) => {
                const item = state.items.find((entry) => entry.id === suggestion.itemId);
                const itemStore = state.stores.find((entry) => entry.id === item?.storeId);
                if (!item || !itemStore || !active) return null;
                return (
                  <li key={suggestion.itemId}>
                    <div className="match-top">
                      <div>
                        <strong>{item.name}</strong>
                        <p>
                          {itemStore.name} · {formatKm(suggestion.distanceKm)} · {formatKg(item.weightKg)} · {item.storage}
                        </p>
                      </div>
                      <p className="score">
                        {suggestion.score}
                        <span> из 100</span>
                      </p>
                    </div>
                    <div className="meter" aria-hidden="true">
                      <span style={{ width: `${suggestion.score}%` }} />
                    </div>
                    <ul className="reasons">
                      {suggestion.reasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                    <p className="fine">
                      Категория {suggestion.parts.fit} · срок {suggestion.parts.urgency} · путь {suggestion.parts.distance} ·
                      приоритет {suggestion.parts.priority} · объём {suggestion.parts.portion}. Осталось {formatHoursLeft(suggestion.hoursLeft)}.
                    </p>
                    <button
                      type="button"
                      className="btn btn-small"
                      onClick={() => {
                        const slot = firstFeasibleSlot(now, item.expiresAt) ?? upcomingSlots(now, 1)[0];
                        if (!slot) return;
                        book({
                          itemIds: [item.id],
                          volunteerId: null,
                          needId: active.id,
                          slotStart: slot.start,
                          slotEnd: slot.end,
                          slotLabel: slot.label,
                        });
                      }}
                    >
                      Зарезервировать под эту нужду
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Math.min(max, Math.max(min, Number(event.target.value) || 0)))}
      />
    </label>
  );
}
