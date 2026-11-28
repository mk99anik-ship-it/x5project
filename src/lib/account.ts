import type { Category, Transaction, Beneficiary, Program } from '../types'
import { fromKop, round2, toKop } from './format'
import { periodKey } from './period'

export type Account = {
  beneficiary: Beneficiary
  program: Program
  period: string
  spent: number
  extra: number
  balance: number
  spentByCategory: Partial<Record<Category, number>>
  cardOpen: boolean
}

export function periodUsage(transactions: Transaction[], beneficiaryId: string, now: number) {
  const key = periodKey(now)
  const spentByCategory: Partial<Record<Category, number>> = {}
  let debitKop = 0
  const grossKop: Partial<Record<Category, number>> = {}
  for (const tx of transactions) {
    if (tx.beneficiaryId !== beneficiaryId) continue
    if (periodKey(tx.createdAt) !== key) continue
    debitKop += toKop(tx.certDebit)
    for (const item of tx.items) {
      grossKop[item.category] = (grossKop[item.category] ?? 0) + toKop(item.certGross)
    }
  }
  for (const [category, amount] of Object.entries(grossKop)) {
    spentByCategory[category as Category] = fromKop(amount ?? 0)
  }
  return { spent: fromKop(debitKop), spentByCategory }
}

export function accountOf(
  beneficiary: Beneficiary,
  program: Program,
  transactions: Transaction[],
  now: number,
): Account {
  const usage = periodUsage(transactions, beneficiary.id, now)
  const period = periodKey(now)
  const extra = round2(beneficiary.extraByPeriod[period] ?? 0)
  const balance = Math.max(0, round2(program.monthlyLimit + extra - usage.spent))
  const cardOpen = beneficiary.status === 'active' && beneficiary.validUntil >= now
  return {
    beneficiary,
    program,
    period,
    spent: usage.spent,
    extra,
    balance,
    spentByCategory: usage.spentByCategory,
    cardOpen,
  }
}
