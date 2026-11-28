import { describe, expect, it } from 'vitest'
import { createSeed } from '../data/seed'
import { PRODUCTS } from '../data/catalog'
import { HARD_FORBIDDEN } from '../types'
import { accountOf } from './account'
import { analyzeFraud } from './fraud'

describe('демо-данные', () => {
  const now = new Date(2026, 10, 18, 15, 0, 0).getTime()
  const state = createSeed(now)

  it('держит три программы и 25 псевдонимных карт', () => {
    expect(state.programs).toHaveLength(3)
    expect(state.beneficiaries).toHaveLength(25)
    expect(PRODUCTS.length).toBeGreaterThanOrEqual(60)
    expect(state.beneficiaries.every((person) => /^ПК-\d+$/.test(person.id))).toBe(true)
    expect(state.transactions.length).toBeGreaterThan(80)
  })

  it('не проводит алкоголь и табак по сертификату и не уходит в минус', () => {
    for (const tx of state.transactions) {
      expect(tx.createdAt).toBeLessThanOrEqual(now)
      let gross = 0
      let cash = 0
      for (const item of tx.items) {
        gross += item.certGross
        cash += item.cash
        if (HARD_FORBIDDEN.includes(item.category)) {
          expect(item.certDebit).toBe(0)
          expect(item.certGross).toBe(0)
        }
        expect(Math.round((item.certGross + item.cash) * 100)).toBe(Math.round(item.unitPrice * item.qty * 100))
      }
      expect(Math.round(gross * 100)).toBe(Math.round(tx.certGross * 100))
      expect(Math.round(cash * 100)).toBe(Math.round(tx.cash * 100))
    }
    for (const person of state.beneficiaries) {
      const program = state.programs.find((item) => item.id === person.programId)!
      const account = accountOf(person, program, state.transactions, now)
      expect(account.balance).toBeGreaterThanOrEqual(0)
      expect(account.spent).toBeLessThanOrEqual(program.monthlyLimit + account.extra + 0.05)
    }
  })

  it('содержит учебные аномалии и коды отказа', () => {
    const limits = Object.fromEntries(
      state.beneficiaries.map((person) => [
        person.id,
        state.programs.find((program) => program.id === person.programId)!.monthlyLimit,
      ]),
    )
    const flags = analyzeFraud({ transactions: state.transactions, limits, now })
    const codes = new Set(flags.map((flag) => flag.code))
    expect(codes.has('burst')).toBe(true)
    expect(codes.has('velocity')).toBe(true)
    expect(codes.has('store_hop')).toBe(true)
    expect(codes.has('unusual_store')).toBe(true)
    expect(codes.has('limit_drain')).toBe(true)
    expect(state.tokens.map((token) => token.code).sort()).toEqual([
      'TK-ALREADY1',
      'TK-EXPIREDX',
      'TK-FRZNCRD1',
      'TK-OLDCARD1',
    ])
  })
})
