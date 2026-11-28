import { useEffect, useMemo, useRef, useState } from 'react'
import { ReceiptView } from '../components/Receipt'
import { Scanner } from '../components/Scanner'
import { lineFromProduct, productById, PRODUCTS, SHOPS } from '../data/catalog'
import { accountOf } from '../lib/account'
import { formatRub } from '../lib/format'
import { useStore, type EdgeKind } from '../state/store'
import type { PayFailure, PaySuccess } from '../lib/checkout'
import { CATEGORIES, CATEGORY_LABELS, type Category, type LineInput } from '../types'

const PAY_ERROR: Record<PayFailure['error'], string> = {
  not_found: 'Код не найден. Попросите обновить карту на телефоне.',
  expired: 'Срок кода истёк. Попросите новый код с телефона.',
  used: 'Этот код уже использован.',
  frozen: 'Карта заблокирована. Оплата баллами недоступна.',
  revoked: 'Карта аннулирована. Оплата баллами недоступна.',
  expired_card: 'Срок действия карты закончился. Оплата баллами недоступна.',
  empty: 'Добавьте товары в чек.',
  bad_card: 'Карта не читается. Попросите другой код.',
}

export function Pos({
  presetNonce,
  preset,
  external,
}: {
  presetNonce: number
  preset: LineInput[] | null
  external: PaySuccess | null
}) {
  const { state, pay, edgeCode, ensureSelfToken } = useStore()
  const [storeId, setStoreId] = useState(SHOPS[0].id)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<Category | 'all'>('all')
  const [basket, setBasket] = useState<LineInput[]>([])
  const [code, setCode] = useState('')
  const [scan, setScan] = useState(false)
  const [local, setLocal] = useState<PaySuccess | PayFailure | null>(null)
  const [hideExternal, setHideExternal] = useState(false)
  const seen = useRef(0)

  useEffect(() => {
    if (!preset || presetNonce === 0 || seen.current === presetNonce) return
    seen.current = presetNonce
    setBasket(preset.map((item) => ({ ...item })))
    setLocal(null)
  }, [preset, presetNonce])

  useEffect(() => {
    if (external) {
      setLocal(null)
      setHideExternal(false)
    }
  }, [external])

  const products = useMemo(
    () =>
      PRODUCTS.filter((product) => (category === 'all' || product.category === category) && product.name.toLowerCase().includes(query.trim().toLowerCase())),
    [category, query],
  )
  const total = basket.reduce((sum, item) => sum + item.unitPrice * item.qty, 0)
  const success = local ? (local.ok ? local : null) : hideExternal ? null : external
  const error = local && !local.ok ? local.error : null

  const submit = (nextCode: string, items: LineInput[]) => {
    setCode(nextCode)
    setLocal(pay({ code: nextCode, storeId, items }))
  }

  const runEdge = (kind: EdgeKind) => {
    const next = edgeCode(kind)
    const items = basket.length > 0 ? basket : [lineFromProduct(productById('milk')!)]
    setBasket(items)
    submit(next, items)
  }

  const overflow = () => {
    const now = Date.now()
    const person = state.beneficiaries.find((item) => item.status === 'active' && item.validUntil >= now)
    if (!person) return
    const program = state.programs.find((item) => item.id === person.programId)
    if (!program) return
    const account = accountOf(person, program, state.transactions, now)
    const rice = productById('rice')!
    const beer = productById('beer')!
    const qty = Math.min(99, Math.max(2, Math.ceil((account.balance + 500) / rice.price)))
    const items = [lineFromProduct(rice, qty), lineFromProduct(beer)]
    const next = ensureSelfToken(person.id)
    if (!next) return
    setBasket(items)
    submit(next, items)
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Касса</h1>
        </div>
        <label>
          Магазин
          <select value={storeId} onChange={(event) => setStoreId(event.target.value)}>
            {SHOPS.map((shop) => (
              <option key={shop.id} value={shop.id}>
                {shop.name}, {shop.address}
              </option>
            ))}
          </select>
        </label>
      </header>
      <div className="pos-layout">
        <section>
          <label>
            Товар
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Название" />
          </label>
          <div className="chips" role="tablist" aria-label="Категории">
            <button type="button" className={category === 'all' ? 'chip on' : 'chip'} onClick={() => setCategory('all')}>
              Все
            </button>
            {CATEGORIES.map((item) => (
              <button key={item} type="button" className={category === item ? 'chip on' : 'chip'} onClick={() => setCategory(item)}>
                {CATEGORY_LABELS[item]}
              </button>
            ))}
          </div>
          <ul className="catalog">
            {products.map((product) => (
              <li key={product.id}>
                <button type="button" className="product" onClick={() => addItem(setBasket, lineFromProduct(product))}>
                  <span>
                    {product.name}
                    <small>
                      {product.unit} · {CATEGORY_LABELS[product.category]}
                    </small>
                  </span>
                  <b>{formatRub(product.price)}</b>
                </button>
              </li>
            ))}
          </ul>
        </section>
        <section id="pos-basket" className="basket-panel">
          <h2>Чек · {formatRub(total)}</h2>
          {basket.length === 0 && <p className="muted">Добавьте товары.</p>}
          <ul className="pick-list">
            {basket.map((item) => (
              <li key={item.productId}>
                <span>
                  {item.name}
                  <small>{formatRub(item.unitPrice * item.qty)}</small>
                </span>
                <span className="qty">
                  <button type="button" onClick={() => changeItem(setBasket, item.productId, -1)} aria-label="Меньше">
                    −
                  </button>
                  <b>{item.qty}</b>
                  <button type="button" onClick={() => changeItem(setBasket, item.productId, 1)} aria-label="Больше">
                    +
                  </button>
                </span>
              </li>
            ))}
          </ul>
          <label>
            Код с карты
            <input value={code} onChange={(event) => setCode(event.target.value)} placeholder="TK-XXXXXXXX" autoCapitalize="characters" />
          </label>
          <div className="row-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setScan(true)}>
              Сканировать QR
            </button>
            <button type="button" className="btn btn-primary" onClick={() => submit(code, basket)}>
              Провести оплату
            </button>
          </div>
          {error && (
            <p className="warn" role="alert">
              {PAY_ERROR[error]}
            </p>
          )}
          {success && (
            <ReceiptView
              storeName={success.transaction.storeName}
              createdAt={success.transaction.createdAt}
              receiptId={success.transaction.id}
              lines={success.split.lines}
              certGross={success.split.certGross}
              certDebit={success.split.certDebit}
              cash={success.split.cash}
            />
          )}
          <details className="judge">
            <summary>Проверить отказ</summary>
            <div className="chips">
              <button type="button" className="chip" onClick={() => runEdge('expired')}>
                Просроченный код
              </button>
              <button type="button" className="chip" onClick={() => runEdge('used')}>
                Код уже использован
              </button>
              <button type="button" className="chip" onClick={() => runEdge('frozen')}>
                Карта заморожена
              </button>
              <button type="button" className="chip" onClick={() => runEdge('expired_card')}>
                Срок карты истёк
              </button>
              <button type="button" className="chip" onClick={overflow}>
                Корзина больше остатка
              </button>
            </div>
          </details>
          {(success || basket.length > 0) && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setBasket([])
                setLocal(null)
                setCode('')
                setHideExternal(true)
              }}
            >
              Новый чек
            </button>
          )}
        </section>
      </div>
      {scan && (
        <Scanner
          onClose={() => setScan(false)}
          onCode={(value) => {
            setScan(false)
            submit(value, basket)
          }}
        />
      )}
    </div>
  )
}

function addItem(setBasket: (value: LineInput[] | ((current: LineInput[]) => LineInput[])) => void, item: LineInput) {
  setBasket((current) => {
    const found = current.find((line) => line.productId === item.productId)
    if (!found) return [...current, item]
    return current.map((line) => (line.productId === item.productId ? { ...line, qty: Math.min(99, line.qty + 1) } : line))
  })
}

function changeItem(setBasket: (value: LineInput[] | ((current: LineInput[]) => LineInput[])) => void, productId: string, delta: number) {
  setBasket((current) =>
    current
      .map((line) => (line.productId === productId ? { ...line, qty: line.qty + delta } : line))
      .filter((line) => line.qty > 0),
  )
}
