import { HARD_FORBIDDEN, type Category } from '../types'
import type { LineInput } from '../types'
import { fromKop, round2, toKop } from './format'

export type Rules = {
  allowed: Category[]
  forbidden: Category[]
  caps: { category: Category; periodCap: number }[]
  multipliers: { category: Category; multiplier: number }[]
}

export type LineOutcome = 'points' | 'partial' | 'cash'

export type LineReason = 'ok' | 'forbidden' | 'not_allowed' | 'cap' | 'balance' | 'cap_balance'

export type LineResult = LineInput & {
  lineTotal: number
  certDebit: number
  certGross: number
  cash: number
  outcome: LineOutcome
  reason: LineReason
}

export type SplitResult = {
  lines: LineResult[]
  certDebit: number
  certGross: number
  cash: number
}

function multiplierFor(rules: Rules, category: Category): number {
  const found = rules.multipliers.find((item) => item.category === category)
  const value = found?.multiplier ?? 1
  return value >= 1 ? value : 1
}

export function splitReceipt(options: {
  items: LineInput[]
  rules: Rules
  balance: number
  spentByCategory: Partial<Record<Category, number>>
}): SplitResult {
  let balanceKop = Math.max(0, toKop(options.balance))
  const spentKop: Partial<Record<Category, number>> = {}
  for (const [category, amount] of Object.entries(options.spentByCategory)) {
    spentKop[category as Category] = Math.max(0, toKop(amount ?? 0))
  }
  const allocated: Partial<Record<Category, number>> = {}
  const caps = new Map(options.rules.caps.map((cap) => [cap.category, Math.max(0, toKop(cap.periodCap))]))
  const forbidden = new Set<Category>([...HARD_FORBIDDEN, ...options.rules.forbidden])
  const allowed = new Set(options.rules.allowed)
  const lines: LineResult[] = []

  for (const item of options.items) {
    const qty = Math.max(0, Math.round(item.qty))
    const unitKop = Math.max(0, toKop(item.unitPrice))
    const lineKop = unitKop * qty
    const base = {
      productId: item.productId,
      name: item.name,
      category: item.category,
      unitPrice: fromKop(unitKop),
      qty,
      lineTotal: fromKop(lineKop),
    }

    if (qty === 0 || lineKop === 0) {
      lines.push({ ...base, certDebit: 0, certGross: 0, cash: 0, outcome: 'cash', reason: 'ok' })
      continue
    }

    if (forbidden.has(item.category)) {
      lines.push({
        ...base,
        certDebit: 0,
        certGross: 0,
        cash: fromKop(lineKop),
        outcome: 'cash',
        reason: 'forbidden',
      })
      continue
    }

    if (!allowed.has(item.category)) {
      lines.push({
        ...base,
        certDebit: 0,
        certGross: 0,
        cash: fromKop(lineKop),
        outcome: 'cash',
        reason: 'not_allowed',
      })
      continue
    }

    const multiplier = multiplierFor(options.rules, item.category)
    let eligibleKop = lineKop
    let hitCap = false
    const cap = caps.get(item.category)
    if (cap !== undefined) {
      const used = (spentKop[item.category] ?? 0) + (allocated[item.category] ?? 0)
      const room = Math.max(0, cap - used)
      if (eligibleKop > room) {
        eligibleKop = room
        hitCap = true
      }
    }

    const neededDebit = Math.round(eligibleKop / multiplier)
    let debitKop = Math.min(balanceKop, neededDebit)
    let grossKop = Math.min(eligibleKop, Math.round(debitKop * multiplier))
    debitKop = Math.min(debitKop, Math.round(grossKop / multiplier))
    grossKop = Math.min(eligibleKop, Math.round(debitKop * multiplier))
    const hitBalance = debitKop < neededDebit
    const cashKop = lineKop - grossKop
    balanceKop -= debitKop
    allocated[item.category] = (allocated[item.category] ?? 0) + grossKop

    let reason: LineReason = 'ok'
    if (cashKop > 0 && hitCap && hitBalance) reason = 'cap_balance'
    else if (cashKop > 0 && hitCap) reason = 'cap'
    else if (cashKop > 0 && hitBalance) reason = 'balance'

    const outcome: LineOutcome = cashKop === 0 ? 'points' : grossKop === 0 ? 'cash' : 'partial'
    lines.push({
      ...base,
      certDebit: fromKop(debitKop),
      certGross: fromKop(grossKop),
      cash: fromKop(cashKop),
      outcome,
      reason,
    })
  }

  const certDebit = fromKop(lines.reduce((sum, line) => sum + toKop(line.certDebit), 0))
  const certGross = fromKop(lines.reduce((sum, line) => sum + toKop(line.certGross), 0))
  const cash = fromKop(lines.reduce((sum, line) => sum + toKop(line.cash), 0))
  return {
    lines,
    certDebit: round2(certDebit),
    certGross: round2(certGross),
    cash: round2(cash),
  }
}
