import { Bars, Donut } from '../components/Charts'
import { formatRub, formatShare } from '../lib/format'
import { monthStats } from '../lib/selectors'
import { plural } from '../lib/text'
import { useStore } from '../state/store'

export function Donors({ onBack }: { onBack: () => void }) {
  const { state } = useStore()
  const stats = monthStats(state)
  const { report, budget } = stats

  return (
    <div className="page donors">
      <header className="page-head">
        <div>
          <p className="kicker">Публичная сводка</p>
          <h1>Куда ушла помощь в этом месяце</h1>
          <p className="lead">
            Здесь нет номеров карт и чеков. Донор видит только суммы, число семей и категории продуктов.
          </p>
        </div>
        <button type="button" className="btn btn-ghost" onClick={onBack}>
          К отчётам фонда
        </button>
      </header>
      <section className="stat-grid">
        <article>
          <p>Семей получили продукты</p>
          <strong>{report.families}</strong>
        </article>
        <article>
          <p>Продуктов на сумму</p>
          <strong>{formatRub(report.gross)}</strong>
        </article>
        <article>
          <p>Полезные категории</p>
          <strong>{formatShare(report.healthyShare)}</strong>
        </article>
        <article>
          <p>Средняя корзина</p>
          <strong>{formatRub(report.avgBasket)}</strong>
        </article>
      </section>
      <section className="budget">
        <div>
          <p className="kicker">Бюджет месяца</p>
          <p className="budget-sum">{formatRub(budget.pool)}</p>
          <p>
            Этих денег хватает на {budget.familiesPossible} {plural(budget.familiesPossible, 'семью', 'семьи', 'семей')}.
            Сертификаты уже выпущены для {budget.issued} {plural(budget.issued, 'семьи', 'семей', 'семей')}.
          </p>
        </div>
      </section>
      <section className="report-grid">
        <article className="panel">
          <h2>Что выбирали</h2>
          {report.byCategory.length === 0 ? (
            <p className="muted">В этом месяце покупок ещё нет.</p>
          ) : (
            <Donut parts={report.byCategory.map((item) => ({ label: item.label, value: item.gross }))} />
          )}
        </article>
        <article className="panel">
          <h2>Как устроена защита</h2>
          <ul className="plain-list">
            <li>Имени, телефона и адреса в сводке нет.</li>
            <li>Код на кассе живёт минуту и принимается один раз.</li>
            <li>Алкоголь и табак баллами не оплачиваются.</li>
            <li>Подозрительные серии смотрит фонд, донору виден только счётчик: сейчас {stats.flags.length}.</li>
          </ul>
        </article>
      </section>
      <section className="panel">
        <h2>Магазины, где прошли покупки</h2>
        <Bars rows={report.byStore.map((item) => ({ label: item.name, value: item.gross }))} />
      </section>
    </div>
  )
}
