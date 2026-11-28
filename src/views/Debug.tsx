import { SHOPS, shopLabel } from '../data/catalog'
import { FLAG_TEXT, analyzeFraud } from '../lib/fraud'
import { formatDateTime } from '../lib/format'
import { useStore } from '../state/store'

export function Debug() {
  const { state } = useStore()
  const now = Date.now()
  const limits = Object.fromEntries(
    state.beneficiaries.map((person) => [
      person.id,
      state.programs.find((program) => program.id === person.programId)?.monthlyLimit ?? 0,
    ]),
  )
  const flags = analyzeFraud({ transactions: state.transactions, limits, now })

  const storeName = (storeId?: string) => {
    const shop = SHOPS.find((item) => item.id === storeId)
    if (shop) return shopLabel(shop)
    const tx = state.transactions.find((item) => item.storeId === storeId)
    return tx?.storeName ?? ''
  }

  const download = () => {
    const rows = [['Дата', 'Карта', 'Магазин', 'Правило']]
    for (const flag of flags) {
      rows.push([
        new Date(flag.at).toISOString(),
        flag.beneficiaryId,
        storeName(flag.storeId),
        FLAG_TEXT[flag.code],
      ])
    }
    const escape = (value: string) => (/[;"\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value)
    const blob = new Blob([`\uFEFF${rows.map((row) => row.map(escape).join(';')).join('\n')}`], {
      type: 'text/csv;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'tihaya-kassa-proverka.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Техраздел</h1>
          <p className="lead">Покупки, которые попали под правила проверки. Оплату это не останавливает.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={download} disabled={flags.length === 0}>
          Скачать эти покупки
        </button>
      </header>
      {flags.length === 0 && <p className="muted">Сейчас таких покупок нет.</p>}
      <ul className="flags">
        {flags.map((flag) => (
          <li key={`${flag.beneficiaryId}-${flag.code}-${flag.at}`}>
            <div>
              <strong>{flag.beneficiaryId}</strong>
              <p>{FLAG_TEXT[flag.code]}</p>
              <p className="muted">
                {formatDateTime(flag.at)}
                {storeName(flag.storeId) ? ` · ${storeName(flag.storeId)}` : ''}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
