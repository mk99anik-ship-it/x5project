import { useEffect, useMemo, useRef, useState } from 'react'
import { QrView } from '../components/QrView'
import { lineFromProduct, PRODUCTS, productById } from '../data/catalog'
import { demoLines } from '../data/seed'
import { accountOf } from '../lib/account'
import { rulesOf } from '../lib/checkout'
import { formatCountdown, formatDateTime, formatRub } from '../lib/format'
import { splitReceipt, type LineReason } from '../lib/split'
import { formatMult } from '../lib/text'
import { RESERVED_CODES } from '../lib/token'
import { useStore } from '../state/store'
import { CATEGORY_LABELS, type Category } from '../types'

const REASON: Record<LineReason, string> = {
  ok: 'баллами',
  forbidden: 'только за свои',
  not_allowed: 'не входит в карту',
  cap: 'потолок категории',
  balance: 'не хватит баллов',
  cap_balance: 'потолок и остаток',
}

export function Wallet({ selectedId, onSelect, plannerSeed }: { selectedId: string | null; onSelect: (id: string) => void; plannerSeed: number }) {
  const { state, ensureSelfToken, issueTrusted } = useStore()
  const [tab, setTab] = useState<'card' | 'rules' | 'history' | 'list'>('card')
  const [large, setLarge] = useState(() => localStorage.getItem('tihaya-kassa-large') === '1')
  const [clock, setClock] = useState(() => Date.now())
  const [list, setList] = useState<{ productId: string; qty: number }[]>([])
  const [find, setFind] = useState('')
  const [copied, setCopied] = useState('')
  const ensureRef = useRef(ensureSelfToken)
  ensureRef.current = ensureSelfToken
  const seenPlanner = useRef(0)

  const person =
    state.beneficiaries.find((item) => item.id === selectedId) ??
    state.beneficiaries.find((item) => item.status === 'active') ??
    state.beneficiaries[0]
  const program = state.programs.find((item) => item.id === person?.programId)
  const account = person && program ? accountOf(person, program, state.transactions, clock) : null

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!person || person.status !== 'active' || person.validUntil < Date.now()) return
    const id = person.id
    const tick = () => ensureRef.current(id)
    tick()
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [person])

  useEffect(() => {
    if (plannerSeed === 0 || seenPlanner.current === plannerSeed) return
    seenPlanner.current = plannerSeed
    setTab('list')
    setList(demoLines().map((item) => ({ productId: item.productId, qty: item.qty })))
  }, [plannerSeed])

  useEffect(() => {
    localStorage.setItem('tihaya-kassa-large', large ? '1' : '0')
  }, [large])

  const token = person
    ? state.tokens.find(
        (item) =>
          item.beneficiaryId === person.id &&
          item.kind === 'self' &&
          !item.used &&
          item.expiresAt > clock &&
          !RESERVED_CODES.has(item.code),
      )
    : undefined
  const trusted = person
    ? state.tokens.find(
        (item) => item.beneficiaryId === person.id && item.kind === 'trusted' && !item.used && item.expiresAt > clock,
      )
    : undefined

  const history = useMemo(() => {
    if (!person) return []
    return state.transactions.filter((item) => item.beneficiaryId === person.id).slice().reverse()
  }, [person, state.transactions])

  const previewItems = list.flatMap((row) => {
    const product = productById(row.productId)
    return product ? [lineFromProduct(product, row.qty)] : []
  })
  const preview =
    account && program
      ? splitReceipt({
          items: previewItems,
          rules: rulesOf(program),
          balance: account.balance,
          spentByCategory: account.spentByCategory,
        })
      : null

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(value)
    } catch {
      setCopied('')
    }
  }

  if (!person || !program || !account) return <p className="page">Нет сертификатов. Выпустите карту в роли фонда.</p>

  const open = person.status === 'active' && person.validUntil >= clock
  const blocked = person.status === 'frozen' ? 'Карта временно заблокирована' : person.status === 'revoked' ? 'Карта аннулирована' : !open ? 'Срок карты закончился' : ''

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="kicker">Роль получателя</p>
          <h1>Кошелёк</h1>
        </div>
      </header>
      <div className="demo-pick">
        <label>
          Демонстрация: чья карта открыта
          <select value={person.id} onChange={(event) => onSelect(event.target.value)}>
            {state.beneficiaries.map((item) => (
              <option key={item.id} value={item.id}>
                {item.id} · {state.programs.find((programItem) => programItem.id === item.programId)?.name}
              </option>
            ))}
          </select>
        </label>
        <p className="muted">На телефоне этого списка нет. Человек видит только свою карту, без слова «помощь».</p>
      </div>
      <div className={large ? 'wallet-layout is-large' : 'wallet-layout'}>
        <div className="phone">
          <div className="phone-bar">
            <span>{new Date(clock).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
            <button type="button" className="text-btn" aria-pressed={large} onClick={() => setLarge((value) => !value)}>
              {large ? 'Обычный шрифт' : 'Крупный шрифт'}
            </button>
          </div>
          <div className="tabs" role="tablist">
            {(
              [
                ['card', 'Карта'],
                ['rules', 'Баллы'],
                ['list', 'Список'],
                ['history', 'История'],
              ] as const
            ).map(([id, label]) => (
              <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'tab on' : 'tab'} onClick={() => setTab(id)}>
                {label}
              </button>
            ))}
          </div>

          {tab === 'card' && (
            <div>
              <article className={blocked ? 'loyalty is-blocked' : 'loyalty'}>
                <div className="loyalty-top">
                  <span>Карта покупателя</span>
                  <span className="loyalty-chip" aria-hidden="true" />
                </div>
                <p className="loyalty-points">
                  {Math.round(account.balance).toLocaleString('ru-RU')} <small>баллов</small>
                </p>
                {blocked ? (
                  <p className="loyalty-block">{blocked}</p>
                ) : token ? (
                  <QrView value={token.code} label="Код карты покупателя" />
                ) : (
                  <p className="loyalty-block">Обновляем код…</p>
                )}
                <div className="loyalty-bottom">
                  <span>{person.id}</span>
                  {token && <span>код {formatCountdown(token.expiresAt - clock)}</span>}
                </div>
              </article>
              {token && !blocked && (
                <div className="code-row">
                  <code>{token.code}</code>
                  <button type="button" className="btn btn-ghost btn-small" onClick={() => copy(token.code)}>
                    {copied === token.code ? 'Скопировано' : 'Скопировать'}
                  </button>
                </div>
              )}
              <p className="muted">Код меняется каждую минуту и сгорает после одной оплаты.</p>
              <Meter spent={account.spent} limit={program.monthlyLimit + account.extra} />
              {!blocked && (
                <div className="trusted">
                  <h2>Передать доверенному лицу</h2>
                  <p>Одноразовый код на 24 часа для родственника или социального работника. На кассе он выглядит так же.</p>
                  {trusted ? (
                    <>
                      <QrView value={trusted.code} label="Код для доверенного лица" />
                      <div className="code-row">
                        <code>{trusted.code}</code>
                        <button type="button" className="btn btn-ghost btn-small" onClick={() => copy(trusted.code)}>
                          {copied === trusted.code ? 'Скопировано' : 'Скопировать'}
                        </button>
                      </div>
                      <p className="muted">Сгорит после одной покупки или через {formatCountdown(trusted.expiresAt - clock)}.</p>
                    </>
                  ) : (
                    <button type="button" className="btn btn-primary" onClick={() => issueTrusted(person.id)}>
                      Создать код
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {tab === 'rules' && (
            <div className="stack">
              <h2>Что списывается баллами</h2>
              <ul className="plain-list">
                {program.allowed.map((category) => (
                  <li key={category}>{CATEGORY_LABELS[category]}</li>
                ))}
              </ul>
              <h2>Только за свои деньги</h2>
              <ul className="plain-list">
                {program.forbidden.map((category) => (
                  <li key={category}>{CATEGORY_LABELS[category]}</li>
                ))}
              </ul>
              {program.caps.map((cap) => {
                const used = account.spentByCategory[cap.category] ?? 0
                return (
                  <p key={cap.category}>
                    {CATEGORY_LABELS[cap.category]}: уже {formatRub(used)} из {formatRub(cap.periodCap)} в этом месяце.
                  </p>
                )
              })}
              {program.multipliers.map((item) => (
                <p key={item.category}>
                  {CATEGORY_LABELS[item.category as Category]} {formatMult(item.multiplier)} — баллы тратятся медленнее.
                </p>
              ))}
            </div>
          )}

          {tab === 'list' && preview && (
            <div className="stack">
              <h2>Список покупок</h2>
              <label>
                Добавить товар
                <input value={find} onChange={(event) => setFind(event.target.value)} placeholder="Молоко, гречка, яблоки" />
              </label>
              {find.trim() && (
                <ul className="pick-list">
                  {PRODUCTS.filter((product) => product.name.toLowerCase().includes(find.trim().toLowerCase()))
                    .slice(0, 6)
                    .map((product) => (
                      <li key={product.id}>
                        <span>
                          {product.name}
                          <small>
                            {formatRub(product.price)} · {product.unit}
                          </small>
                        </span>
                        <button type="button" className="btn btn-ghost btn-small" onClick={() => addQty(setList, product.id)}>
                          В список
                        </button>
                      </li>
                    ))}
                </ul>
              )}
              {list.length === 0 && <p className="muted">Список пуст. Добавьте продукты и сразу увидите, хватит ли баллов.</p>}
              <ul className="pick-list">
                {preview.lines.map((line) => (
                  <li key={line.productId}>
                    <span>
                      {line.name}
                      <small>
                        {formatRub(line.lineTotal)} · {REASON[line.reason]}
                      </small>
                    </span>
                    <span className="qty">
                      <button type="button" onClick={() => changeQty(setList, line.productId, -1)} aria-label="Меньше">
                        −
                      </button>
                      <b>{line.qty}</b>
                      <button type="button" onClick={() => changeQty(setList, line.productId, 1)} aria-label="Больше">
                        +
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
              {preview.lines.length > 0 && (
                <div className={preview.cash > 0 ? 'warn' : 'ok'} role="status">
                  Баллами покроется {formatRub(preview.certGross)}.
                  {preview.cash > 0
                    ? ` На кассе нужно доплатить ${formatRub(preview.cash)}.`
                    : ' Доплачивать не нужно.'}
                </div>
              )}
            </div>
          )}

          {tab === 'history' && (
            <div className="stack">
              <h2>Покупки</h2>
              {history.length === 0 && <p className="muted">Покупок пока нет.</p>}
              <ul className="history">
                {history.map((tx) => (
                  <li key={tx.id}>
                    <div>
                      <strong>{formatDateTime(tx.createdAt)}</strong>
                      <span className="muted">{tx.storeName}</span>
                    </div>
                    <p>
                      Баллами {formatRub(tx.certGross)}
                      {tx.certDebit !== tx.certGross ? ` · с лимита ${formatRub(tx.certDebit)}` : ''}
                      {tx.cash > 0 ? ` · доплата ${formatRub(tx.cash)}` : ''}
                      {tx.via === 'trusted' ? ' · доверенное лицо' : ''}
                    </p>
                    <p className="muted">{tx.items.map((item) => item.name).join(', ')}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <aside className="wallet-note">
          <p className="kicker">Как это видит человек</p>
          <h2>Обычная карта, не талон на помощь</h2>
          <p>
            На экране нет слов «фонд» и «благотворительность». QR живёт минуту и принимается один раз: снимок экрана
            нельзя переслать и использовать снова.
          </p>
          <p>Крупный шрифт увеличивает текст и кнопки. Код для родственника сгорает после одной покупки.</p>
          <p>Список покупок считает цены заранее и предупреждает, если баллы не покроют корзину.</p>
        </aside>
      </div>
    </div>
  )
}

function Meter({ spent, limit }: { spent: number; limit: number }) {
  const pct = limit <= 0 ? 0 : Math.min(100, (spent / limit) * 100)
  return (
    <div className="meter">
      <div className="meter-label">
        <span>Потрачено в этом месяце</span>
        <span>
          {formatRub(spent)} из {formatRub(limit)}
        </span>
      </div>
      <div className="meter-track" role="meter" aria-valuemin={0} aria-valuemax={Math.round(limit)} aria-valuenow={Math.round(spent)} aria-label="Потрачено в этом месяце">
        <div style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function addQty(setList: (value: { productId: string; qty: number }[] | ((current: { productId: string; qty: number }[]) => { productId: string; qty: number }[])) => void, productId: string) {
  setList((current) => {
    const found = current.find((item) => item.productId === productId)
    if (!found) return [...current, { productId, qty: 1 }]
    return current.map((item) => (item.productId === productId ? { ...item, qty: Math.min(99, item.qty + 1) } : item))
  })
}

function changeQty(
  setList: (value: { productId: string; qty: number }[] | ((current: { productId: string; qty: number }[]) => { productId: string; qty: number }[])) => void,
  productId: string,
  delta: number,
) {
  setList((current) =>
    current
      .map((item) => (item.productId === productId ? { ...item, qty: item.qty + delta } : item))
      .filter((item) => item.qty > 0),
  )
}
