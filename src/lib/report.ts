import { CATEGORY_LABELS, HEALTHY_CATEGORIES, type Category, type Program, type Transaction } from '../types'
import { fromKop, toKop } from './format'

export type Report = {
  spent: number
  gross: number
  cash: number
  families: number
  receipts: number
  avgBasket: number
  avgCovered: number
  healthyShare: number
  trustedShare: number
  byCategory: { category: Category; label: string; gross: number }[]
  byStore: { storeId: string; name: string; gross: number; receipts: number }[]
  storeCount: number
}

export function buildReport(transactions: Transaction[], from: number, to: number): Report {
  const slice = transactions.filter((tx) => tx.createdAt >= from && tx.createdAt <= to)
  let spentKop = 0
  let grossKop = 0
  let cashKop = 0
  let healthyKop = 0
  let trusted = 0
  const families = new Set<string>()
  const categories = new Map<Category, number>()
  const stores = new Map<string, { name: string; gross: number; receipts: number }>()

  for (const tx of slice) {
    spentKop += toKop(tx.certDebit)
    grossKop += toKop(tx.certGross)
    cashKop += toKop(tx.cash)
    if (tx.certDebit > 0) families.add(tx.beneficiaryId)
    if (tx.via === 'trusted' && tx.certDebit > 0) trusted += 1
    const store = stores.get(tx.storeId) ?? { name: tx.storeName, gross: 0, receipts: 0 }
    store.gross += tx.certGross
    store.receipts += 1
    stores.set(tx.storeId, store)
    for (const item of tx.items) {
      categories.set(item.category, (categories.get(item.category) ?? 0) + item.certGross)
      if (HEALTHY_CATEGORIES.includes(item.category)) healthyKop += toKop(item.certGross)
    }
  }

  const receipts = slice.length
  const helpedReceipts = slice.filter((tx) => tx.certDebit > 0).length
  return {
    spent: fromKop(spentKop),
    gross: fromKop(grossKop),
    cash: fromKop(cashKop),
    families: families.size,
    receipts,
    avgBasket: receipts === 0 ? 0 : fromKop(Math.round((grossKop + cashKop) / receipts)),
    avgCovered: helpedReceipts === 0 ? 0 : fromKop(Math.round(grossKop / helpedReceipts)),
    healthyShare: grossKop === 0 ? 0 : healthyKop / grossKop,
    trustedShare: families.size === 0 ? 0 : trusted / Math.max(1, slice.filter((tx) => tx.certDebit > 0).length),
    byCategory: [...categories.entries()]
      .map(([category, gross]) => ({ category, label: CATEGORY_LABELS[category], gross }))
      .filter((item) => item.gross > 0)
      .sort((a, b) => b.gross - a.gross),
    byStore: [...stores.entries()]
      .map(([storeId, value]) => ({ storeId, name: value.name, gross: value.gross, receipts: value.receipts }))
      .sort((a, b) => b.gross - a.gross),
    storeCount: stores.size,
  }
}

export function budgetSnapshot(options: {
  pool: number
  programs: Program[]
  activeLimits: number[]
  spent: number
}) {
  const committed = options.activeLimits.reduce((sum, value) => sum + value, 0)
  const average =
    options.activeLimits.length > 0
      ? committed / options.activeLimits.length
      : options.programs.length > 0
        ? options.programs.reduce((sum, program) => sum + program.monthlyLimit, 0) / options.programs.length
        : 0
  const familiesPossible = average > 0 ? Math.floor(options.pool / average) : 0
  const issued = options.activeLimits.length
  return {
    pool: options.pool,
    committed,
    spent: options.spent,
    remaining: options.pool - options.spent,
    average,
    familiesPossible,
    issued,
    freeSlots: Math.max(0, familiesPossible - issued),
  }
}

export function transactionsToCsv(transactions: Transaction[]): string {
  const rows: string[][] = [
    ['Дата', 'Магазин', 'Идентификатор', 'Товар', 'Категория', 'Количество', 'Баллы', 'Доплата', 'Кто оплатил'],
  ]
  const sorted = [...transactions].sort((a, b) => a.createdAt - b.createdAt)
  for (const tx of sorted) {
    for (const item of tx.items) {
      rows.push([
        new Date(tx.createdAt).toISOString(),
        tx.storeName,
        tx.beneficiaryId,
        item.name,
        CATEGORY_LABELS[item.category],
        String(item.qty),
        item.certDebit.toFixed(2),
        item.cash.toFixed(2),
        tx.via === 'trusted' ? 'доверенное лицо' : 'держатель карты',
      ])
    }
  }
  const escape = (value: string) => (/[;"\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value)
  return `\uFEFF${rows.map((row) => row.map(escape).join(';')).join('\n')}`
}
