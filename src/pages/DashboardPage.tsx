import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { PageIntro } from '../components/Ui';
import { formatFixed, formatInt, formatKg, formatRub } from '../lib/format';
import { formatHoursLeft } from '../lib/time';
import {
  ADULT_DAY_KG,
  CHILD_DAY_KG,
  CO2_KG_PER_FOOD_KG,
  dashboardMetrics,
  ELDERLY_DAY_KG,
  PERSON_DAY_KG,
  RED_FLAG_HOURS,
} from '../lib/metrics';
import { useApp, useNow } from '../state/store';

export function DashboardPage() {
  const { state } = useApp();
  const now = useNow();
  const metrics = dashboardMetrics(state.needs, state.items, now);
  const maxKg = Math.max(...metrics.topStores.map((store) => store.kg), 1);

  return (
    <div className="stack">
      <PageIntro
        eyebrow="Дашборд фонда"
        title="Что уже спасено и где горит срок"
        text="Цифры считаются по переданным товарам демо. Коэффициенты CO₂ и человеко-дней приблизительные, они подписаны рядом с карточками."
      />

      <section className="kpi-grid">
        <article className="kpi">
          <p>Спасено</p>
          <strong>{formatKg(metrics.rescuedKg)}</strong>
          <span>Статус «передано». Списанное не входит.</span>
        </article>
        <article className="kpi">
          <p>CO₂ не выброшено</p>
          <strong>{formatKg(metrics.co2Kg)}</strong>
          <span>Коэффициент {formatFixed(CO2_KG_PER_FOOD_KG, 1)} кг CO₂-экв. на 1 кг еды, оценка приблизительная.</span>
        </article>
        <article className="kpi">
          <p>Человеко-дни</p>
          <strong>{formatFixed(metrics.personDays, 1)}</strong>
          <span>Норма {formatFixed(PERSON_DAY_KG, 2)} кг смешанной поддержки на человека в сутки.</span>
        </article>
        <article className="kpi">
          <p>Сохранено в ценах</p>
          <strong>{formatRub(metrics.valueRub)}</strong>
          <span>Сумма цен переданных партий по каталогу.</span>
        </article>
        <article className="kpi">
          <p>Нужды закрыты</p>
          <strong>{formatFixed(metrics.needsClosedPercent, 0)}%</strong>
          <span>
            {metrics.closedCount} полностью, {metrics.partialCount} частично из {metrics.needCount}. Считается доля суточной нормы.
          </span>
        </article>
      </section>

      <div className="split">
        <section className="panel">
          <h2>Передача за 14 дней</h2>
          <div className="chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metrics.series}>
                <CartesianGrid stroke="#E7DCCB" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#5c5146', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#5c5146', fontSize: 12 }} axisLine={false} tickLine={false} width={36} />
                <Tooltip formatter={(value) => [formatKg(Number(value ?? 0)), 'Передано']} />
                <Line type="monotone" dataKey="kg" stroke="#8f3d16" strokeWidth={2.5} dot={{ r: 3 }} name="кг" isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <table className="data-table">
            <caption>Килограммы, переданные по дням</caption>
            <thead>
              <tr>
                <th>День</th>
                <th>Кг</th>
                <th>₽</th>
              </tr>
            </thead>
            <tbody>
              {metrics.series.map((point) => (
                <tr key={point.day}>
                  <td>{point.label}</td>
                  <td>{formatFixed(point.kg, 1)}</td>
                  <td>{formatInt(point.rub)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="panel">
          <h2>Магазины</h2>
          <div className="chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={metrics.topStores.map((store) => ({
                  name: state.stores.find((item) => item.id === store.storeId)?.name ?? store.storeId,
                  kg: store.kg,
                }))}
                margin={{ left: 8, right: 12 }}
              >
                <CartesianGrid stroke="#E7DCCB" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#5c5146', fontSize: 12 }} />
                <YAxis type="category" dataKey="name" width={108} tick={{ fill: '#5c5146', fontSize: 12 }} />
                <Tooltip formatter={(value) => [formatKg(Number(value ?? 0)), 'Передано']} />
                <Bar dataKey="kg" fill="#c56a32" radius={[0, 6, 6, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <ul className="rank">
            {metrics.topStores.map((store) => {
              const info = state.stores.find((item) => item.id === store.storeId);
              return (
                <li key={store.storeId}>
                  <span>{info?.name}</span>
                  <span className="rank-bar" aria-hidden="true">
                    <i style={{ width: `${(store.kg / maxKg) * 100}%` }} />
                  </span>
                  <strong>{formatKg(store.kg)}</strong>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <section className="panel">
        <div className="panel-head">
          <h2>Красные флаги</h2>
          <p>Свободные товары, которые истекают в ближайшие {RED_FLAG_HOURS} ч и ещё не забронированы.</p>
        </div>
        {metrics.flags.length === 0 ? (
          <p className="empty">Сейчас таких товаров нет: всё скоропортящееся либо забронировано, либо уже передано.</p>
        ) : (
          <ul className="flag-list">
            {metrics.flags.map((flag) => {
              const store = state.stores.find((item) => item.id === flag.storeId);
              return (
                <li key={flag.itemId}>
                  <div>
                    <strong>{flag.name}</strong>
                    <p>
                      {store?.name}, {store?.district} · {formatKg(flag.weightKg)} · осталось {formatHoursLeft(flag.hoursLeft)}
                    </p>
                  </div>
                  <Link className="btn btn-small" to={`/volonter?store=${flag.storeId}`}>
                    Открыть у волонтёра
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <details className="panel hint">
        <summary>Как посчитаны нормы</summary>
        <div className="prose">
          <p>
            CO₂: {formatFixed(CO2_KG_PER_FOOD_KG, 1)} кг CO₂-эквивалента на 1 кг предотвращённых пищевых отходов. Это
            обобщённый коэффициент по оценкам FAO и WRAP для смешанной продуктовой корзины. Для отдельной категории он
            будет другим, поэтому на экране он помечен как приблизительный.
          </p>
          <p>
            Суточная продуктовая поддержка одной заявки: взрослый {formatFixed(ADULT_DAY_KG, 1)} кг, ребёнок{' '}
            {formatFixed(CHILD_DAY_KG, 1)} кг, пожилой человек {formatFixed(ELDERLY_DAY_KG, 1)} кг. Взрослые считаются как
            размер семьи минус дети и пожилые. Это учебная норма фонда для планирования выдачи, не медицинская норма калорий.
          </p>
          <p>
            Человеко-дни на карточках считаются проще: все переданные килограммы делятся на {formatFixed(PERSON_DAY_KG, 2)} кг.
            Так цифра не приписывает конкретный продукт конкретному человеку.
          </p>
          <p>
            Процент закрытых нужд — это сумма покрытых килограммов (бронь и передача), но не больше нормы каждой заявки,
            делённая на сумму норм. Полностью закрытой считается заявка, где покрытие не меньше суточной нормы.
          </p>
        </div>
      </details>
    </div>
  );
}
