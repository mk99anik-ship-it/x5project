import type { StoreState } from '../types'
import { analyzeFraud } from './fraud'
import { periodStart } from './period'
import { budgetSnapshot, buildReport } from './report'

export function monthStats(state: StoreState, now = Date.now()) {
  const from = periodStart(now)
  const report = buildReport(state.transactions, from, now)
  const active = state.beneficiaries.filter((person) => person.status === 'active' && person.validUntil >= now)
  const limitOf = (id: string) =>
    state.programs.find((program) => program.id === state.beneficiaries.find((person) => person.id === id)?.programId)
      ?.monthlyLimit ?? 0
  const limits = active.map((person) => limitOf(person.id))
  const budget = budgetSnapshot({
    pool: state.pool,
    programs: state.programs,
    activeLimits: limits,
    spent: report.spent,
  })
  const allLimits = Object.fromEntries(state.beneficiaries.map((person) => [person.id, limitOf(person.id)]))
  const flags = analyzeFraud({ transactions: state.transactions, limits: allLimits, now }).filter(
    (flag) => flag.at >= from && flag.at <= now,
  )
  return { from, now, report, budget, flags, activeCount: active.length }
}
