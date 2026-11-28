import { Bars, Donut } from '../components/Charts'
import { formatRub, formatShare } from '../lib/format'
import { monthStats } from '../lib/selectors'
import { plural } from '../lib/text'
import { useStore } from '../state/store'

export function Volunteers({ onBack }: { onBack: () => void }) {
  const { state } = useStore()
  const { report, budget } = monthStats(state)

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Для волонтёров</h1>
          <p className="lead">Сколько семей получили продукты в этом месяце и где ещё можно выдать карты.</p>
        </div>
        <button type="button" className="btn btn-ghost" onClick={onBack}>
          К отчётам
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
          <p>Доля полезных продуктов</p>
          <strong>{formatShare(report.healthyShare)}</strong>
        </article>
        <article>
          <p>Средняя корзина</p>
          <strong>{formatRub(report.avgBasket)}</strong>
        </article>
      </section>
      <section className="budget">
        <div>
          <p className="kicker">Бюджет фонда</p>
          <p className="budget-sum">{formatRub(budget.pool)}</p>
          <p>
            Бюджета хватит на {budget.familiesPossible} {plural(budget.familiesPossible, 'семью', 'семьи', 'семей')}. Сейчас
            выдано {budget.issued} {plural(budget.issued, 'карта', 'карты', 'карт')}, можно выдать ещё {budget.freeSlots}.
          </p>
        </div>
      </section>
      <section className="report-grid">
        <article className="panel">
          <h2>Какие продукты брали</h2>
          {report.byCategory.length === 0 ? (
            <p className="muted">В этом месяце покупок нет.</p>
          ) : (
            <Donut parts={report.byCategory.map((item) => ({ label: item.label, value: item.gross }))} />
          )}
        </article>
        <article className="panel">
          <h2>В каких магазинах покупали</h2>
          <Bars rows={report.byStore.map((item) => ({ label: item.name, value: item.gross }))} />
          <p className="muted">Номеров карт и имён в этой сводке нет.</p>
        </article>
      </section>
    </div>
  )
}
