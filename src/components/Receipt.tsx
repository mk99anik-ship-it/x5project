import { formatDateTime, formatRub } from '../lib/format'
import type { LineReason, LineResult } from '../lib/split'

const REASON: Record<LineReason, string> = {
  ok: 'Покрыто баллами',
  forbidden: 'Категория не оплачивается баллами',
  not_allowed: 'Категории нет в условиях карты',
  cap: 'Исчерпан лимит категории',
  balance: 'Не хватило баллов',
  cap_balance: 'Упёрлись и в лимит категории, и в остаток баллов',
}

export function ReceiptView({
  storeName,
  createdAt,
  receiptId,
  lines,
  certGross,
  certDebit,
  cash,
}: {
  storeName: string
  createdAt: number
  receiptId: string
  lines: LineResult[]
  certGross: number
  certDebit: number
  cash: number
}) {
  return (
    <article className="receipt">
      <header>
        <p className="kicker">Кассовый чек</p>
        <h3>{storeName}</h3>
        <p className="muted">
          {formatDateTime(createdAt)} · {receiptId}
        </p>
      </header>
      <ul className="receipt-lines">
        {lines.map((line, index) => (
          <li key={`${line.productId}-${index}`}>
            <div>
              <strong>
                {line.name}
                {line.qty > 1 ? ` × ${line.qty}` : ''}
              </strong>
              <span className="muted">{formatRub(line.lineTotal)}</span>
            </div>
            <div className="receipt-pay">
              <span>Баллы {formatRub(line.certGross)}</span>
              <span>К оплате {formatRub(line.cash)}</span>
            </div>
          </li>
        ))}
      </ul>
      <dl className="receipt-total">
        <div>
          <dt>Оплачено баллами карты</dt>
          <dd>{formatRub(certGross)}</dd>
        </div>
        <div>
          <dt>К оплате</dt>
          <dd>{formatRub(cash)}</dd>
        </div>
      </dl>
      <details className="judge">
        <summary>Для проверки: как разделился чек</summary>
        <p>Этого блока нет на экране кассира. Покупатель и очередь видят только баллы и доплату.</p>
        <ul>
          {lines.map((line, index) => (
            <li key={`${line.productId}-why-${index}`}>
              {line.name}: {REASON[line.reason]}. Покрыто {formatRub(line.certGross)}, с лимита списано{' '}
              {formatRub(line.certDebit)}, доплата {formatRub(line.cash)}.
            </li>
          ))}
        </ul>
        <p>
          Итого с лимита сертификата: {formatRub(certDebit)}. На полке эти продукты стоят {formatRub(certGross)}: полезные
          категории тратят лимит медленнее.
        </p>
      </details>
    </article>
  )
}
