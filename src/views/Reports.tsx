import { useMemo, useState } from 'react'
import { Bars, Donut } from '../components/Charts'
import { SHOPS } from '../data/catalog'
import { formatDateTime, formatRub, formatShare } from '../lib/format'
import { addDays, periodEnd, periodLabel, periodStart } from '../lib/period'
import { FLAG_LEVEL, FLAG_TEXT, analyzeFraud } from '../lib/fraud'
import { buildReport, transactionsToCsv } from '../lib/report'
import { plural } from '../lib/text'
import { useStore } from '../state/store'

type Range = 'month' | 'prev' | 'days'

export function Reports({ onVolunteers }: { onVolunteers: () => void }) {
  const { state } = useStore()
  const [range, setRange] = useState<Range>('month')
  const now = Date.now()
  const bounds = useMemo(() => {
    if (range === 'prev') {
      const cursor = new Date(now)
      cursor.setMonth(cursor.getMonth() - 1)
      const stamp = cursor.getTime()
      return { from: periodStart(stamp), to: periodEnd(stamp), title: periodLabel(stamp) }
    }
    if (range === 'days') return { from: addDays(now, -60), to: now, title: '60 дней' }
    return { from: periodStart(now), to: now, title: periodLabel(now) }
  }, [now, range])
  const report = buildReport(state.transactions, bounds.from, bounds.to)
  const limits = Object.fromEntries(
    state.beneficiaries.map((person) => [
      person.id,
      state.programs.find((program) => program.id === person.programId)?.monthlyLimit ?? 0,
    ]),
  )
  const flags = analyzeFraud({ transactions: state.transactions, limits, now }).filter(
    (flag) => flag.at >= bounds.from && flag.at <= bounds.to,
  )

  const download = () => {
    const slice = state.transactions.filter((tx) => tx.createdAt >= bounds.from && tx.createdAt <= bounds.to)
    const blob = new Blob([transactionsToCsv(slice)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'tihaya-kassa-otchet.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Отчёты</h1>
          <p className="muted">{bounds.title}</p>
        </div>
        <div className="row-actions">
          <button type="button" className="btn btn-ghost" onClick={onVolunteers}>
            Для волонтёров
          </button>
          <button type="button" className="btn btn-primary" onClick={download}>
            Скачать таблицу
          </button>
        </div>
      </header>
      <div className="chips" role="tablist" aria-label="Период">
        {(
          [
            ['month', 'Этот месяц'],
            ['prev', 'Прошлый месяц'],
            ['days', '60 дней'],
          ] as const
        ).map(([id, label]) => (
          <button key={id} type="button" className={range === id ? 'chip on' : 'chip'} onClick={() => setRange(id)}>
            {label}
          </button>
        ))}
      </div>
      <section className="stat-grid">
        <article>
          <p>Сумма продуктов по карте</p>
          <strong>{formatRub(report.gross)}</strong>
        </article>
        <article>
          <p>Списано с лимитов</p>
          <strong>{formatRub(report.spent)}</strong>
        </article>
        <article>
          <p>Семей с покупкой</p>
          <strong>
            {report.families} {plural(report.families, 'семья', 'семьи', 'семей')}
          </strong>
        </article>
        <article>
          <p>Средний чек</p>
          <strong>{formatRub(report.avgBasket)}</strong>
        </article>
        <article>
          <p>Доля полезных продуктов</p>
          <strong>{formatShare(report.healthyShare)}</strong>
        </article>
        <article>
          <p>Магазинов</p>
          <strong>{report.storeCount}</strong>
        </article>
      </section>
      <section className="report-grid">
        <article className="panel">
          <h2>Категории</h2>
          {report.byCategory.length === 0 ? <p className="muted">Покупок нет.</p> : <Donut parts={report.byCategory.map((item) => ({ label: item.label, value: item.gross }))} />}
        </article>
        <article className="panel">
          <h2>Магазины</h2>
          <Bars rows={report.byStore.map((item) => ({ label: item.name, value: item.gross }))} />
        </article>
      </section>
      <section className="panel">
        <h2>Покупки, которые стоит проверить</h2>
        {flags.length === 0 && <p>Таких покупок нет.</p>}
        <ul className="flags">
          {flags.map((flag) => {
            const shop = SHOPS.find((item) => item.id === flag.storeId)
            return (
              <li key={`${flag.beneficiaryId}-${flag.code}-${flag.at}`}>
                <span className={`pill pill-${FLAG_LEVEL[flag.code]}`}>{FLAG_LEVEL[flag.code] === 'high' ? 'важно' : FLAG_LEVEL[flag.code] === 'medium' ? 'проверить' : 'заметка'}</span>
                <div>
                  <strong>{flag.beneficiaryId}</strong>
                  <p>{FLAG_TEXT[flag.code]}</p>
                  <p className="muted">
                    {formatDateTime(flag.at)}
                    {shop ? ` · ${shop.name}, ${shop.address}` : ''}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
