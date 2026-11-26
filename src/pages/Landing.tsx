import { Link } from 'react-router-dom';
import { dashboardMetrics } from '../lib/metrics';
import { formatInt, formatKg, plural } from '../lib/format';
import { useApp, useNow } from '../state/store';

export function Landing() {
  const { state } = useApp();
  const now = useNow();
  const metrics = dashboardMetrics(state.needs, state.items, now);
  const openNeeds = state.needs.length - metrics.closedCount;

  return (
    <div className="stack">
      <section className="hero">
        <div>
          <p className="eyebrow">Как это работает</p>
          <h1>Вечерний остаток доходит до конкретной нужды, пока продукт ещё годен</h1>
          <p className="lede">
            «Вечерняя полка» соединяет товары с истекающим сроком и помятой упаковкой с заявками пунктов
            помощи фонда «Выручаем». Сначала фиксируется нужда семьи или пункта, затем подбирается подходящий
            остаток, а волонтёр забирает его в назначенный слот.
          </p>
          <div className="hero-actions">
            <Link className="btn" to="/magazin">
              Я в магазине
            </Link>
            <Link className="btn btn-ghost" to="/nuzhdy">
              Подобрать под нужду
            </Link>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <svg viewBox="0 0 360 280">
            <rect width="360" height="280" rx="28" fill="#F3E4D2" />
            <circle cx="286" cy="58" r="22" fill="#F0C56A" />
            <rect x="48" y="48" width="168" height="184" rx="18" fill="#FFFDF9" />
            <path d="M68 92h128M68 142h128M68 192h128" stroke="#C56A32" strokeWidth="6" strokeLinecap="round" />
            <rect x="78" y="70" width="28" height="16" rx="4" fill="#8F3D16" />
            <rect x="114" y="68" width="22" height="18" rx="4" fill="#1D6B45" />
            <rect x="146" y="72" width="34" height="14" rx="4" fill="#23486E" />
            <rect x="84" y="118" width="46" height="16" rx="4" fill="#C56A32" />
            <rect x="138" y="116" width="28" height="18" rx="4" fill="#E7B15A" />
            <rect x="78" y="168" width="36" height="16" rx="4" fill="#9D2218" />
            <rect x="122" y="170" width="48" height="14" rx="4" fill="#1D6B45" />
            <rect x="232" y="150" width="86" height="70" rx="16" fill="#8F3D16" />
            <path d="M248 176h54M248 192h36" stroke="#F6E2D4" strokeWidth="4" strokeLinecap="round" />
          </svg>
        </div>
      </section>

      <section className="stat-strip" aria-label="Сводка демо">
        <article>
          <strong>{formatKg(metrics.rescuedKg)}</strong>
          <span>уже передано в демо</span>
        </article>
        <article>
          <strong>
            {openNeeds} {plural(openNeeds, 'нужда', 'нужды', 'нужд')}
          </strong>
          <span>ещё не закрыты полностью</span>
        </article>
        <article>
          <strong>{formatInt(metrics.flags.length)}</strong>
          <span>скоропорт без брони, до 6 часов</span>
        </article>
        <article>
          <strong>{state.stores.length}</strong>
          <span>магазина в Москве</span>
        </article>
      </section>

      <section className="section">
        <h2>Три шага за один вечер</h2>
        <ol className="steps">
          <li>
            <span>1</span>
            <div>
              <h3>Магазин ставит остаток на полку</h3>
              <p>Сотрудник находит товар по названию или штрихкоду, указывает количество и срок. На это уходит около десяти секунд.</p>
            </div>
          </li>
          <li>
            <span>2</span>
            <div>
              <h3>Пункт описывает нужду</h3>
              <p>
                Состав семьи, дети, пожилые, ограничения и район. Сервис предлагает продукты и объясняет, почему каждый из них подходит.
              </p>
            </div>
          </li>
          <li>
            <span>3</span>
            <div>
              <h3>Волонтёр забирает в свой слот</h3>
              <p>Бронь привязана ко времени. Если забор не состоялся, слот сгорает, а ещё годный товар снова становится свободным.</p>
            </div>
          </li>
        </ol>
      </section>

      <section className="section">
        <h2>Кому это полезно</h2>
        <div className="value-grid">
          <article>
            <p className="eyebrow">Фонд</p>
            <h3>Нужда закрывается адресно</h3>
            <p>
              Вместо случайного набора видно, какая заявка получила продукты, где горит срок и какие магазины уже помогают.
            </p>
          </article>
          <article>
            <p className="eyebrow">Подопечные</p>
            <h3>Еда подходит семье</h3>
            <p>
              Учитываются дети, пожилые, безглютеновое питание, детское питание и ограничение сахара при диабете. В систему не попадают имена.
            </p>
          </article>
          <article>
            <p className="eyebrow">Магазин</p>
            <h3>Меньше списаний</h3>
            <p>
              Смена не учится новой системе: поиск, количество, срок, кнопка. Передача фиксируется актом. Это простой вклад в ESG.
            </p>
          </article>
        </div>
      </section>

      <section className="cta-band">
        <div>
          <h2>Откройте роль и пройдите вечер</h2>
          <p>На полке уже есть остатки, брони и заявки. Всё хранится в этом браузере, демо можно сбросить в любой момент.</p>
        </div>
        <div className="hero-actions">
          <Link className="btn" to="/volonter">
            Маршрут волонтёра
          </Link>
          <Link className="btn btn-ghost" to="/dashboard">
            Дашборд фонда
          </Link>
        </div>
      </section>
    </div>
  );
}
