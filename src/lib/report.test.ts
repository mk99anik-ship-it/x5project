import { describe, expect, it } from 'vitest'
import type { Program, Transaction } from '../types'
import { budgetSnapshot, buildReport, transactionsToCsv } from './report'

const program: Program = {
  id: 'p',
  name: 'Семьи',
  description: '',
  monthlyLimit: 6000,
  validityMonths: 6,
  allowed: [],
  forbidden: [],
  caps: [],
  multipliers: [],
}

function tx(partial: Partial<Transaction> & Pick<Transaction, 'id' | 'createdAt' | 'certDebit'>): Transaction {
  return {
    beneficiaryId: 'ПК-1',
    programId: 'p',
    storeId: 's1',
    storeName: 'Пятёрочка, ул. Лесная, 12',
    items: [
      {
        productId: 'milk',
        name: 'Молоко',
        category: 'dairy',
        qty: 1,
        unitPrice: partial.certDebit,
        certDebit: partial.certDebit,
        certGross: partial.certGross ?? partial.certDebit,
        cash: partial.cash ?? 0,
      },
    ],
    certGross: partial.certGross ?? partial.certDebit,
    cash: partial.cash ?? 0,
    tokenCode: 'TK-1',
    via: 'self',
    ...partial,
  }
}

describe('reports', () => {
  it('считает семьи, среднюю корзину и долю полезных продуктов', () => {
    const from = new Date(2026, 5, 1).getTime()
    const to = new Date(2026, 5, 30).getTime()
    const transactions: Transaction[] = [
      tx({
        id: '1',
        createdAt: new Date(2026, 5, 10).getTime(),
        certDebit: 100,
        certGross: 200,
        cash: 50,
        items: [
          {
            productId: 'apple',
            name: 'Яблоки',
            category: 'vegetables',
            qty: 1,
            unitPrice: 200,
            certDebit: 100,
            certGross: 200,
            cash: 0,
          },
          {
            productId: 'beer',
            name: 'Пиво',
            category: 'alcohol',
            qty: 1,
            unitPrice: 50,
            certDebit: 0,
            certGross: 0,
            cash: 50,
          },
        ],
      }),
      tx({
        id: '2',
        createdAt: new Date(2026, 5, 12).getTime(),
        beneficiaryId: 'ПК-2',
        storeId: 's2',
        storeName: 'Перекрёсток',
        certDebit: 80,
        certGross: 80,
        via: 'trusted',
        items: [
          {
            productId: 'cookie',
            name: 'Печенье',
            category: 'sweets',
            qty: 1,
            unitPrice: 80,
            certDebit: 80,
            certGross: 80,
            cash: 0,
          },
        ],
      }),
      tx({
        id: '3',
        createdAt: new Date(2026, 4, 2).getTime(),
        certDebit: 999,
      }),
    ]
    const report = buildReport(transactions, from, to)
    expect(report.families).toBe(2)
    expect(report.spent).toBe(180)
    expect(report.gross).toBe(280)
    expect(report.cash).toBe(50)
    expect(report.receipts).toBe(2)
    expect(report.avgBasket).toBe(165)
    expect(report.healthyShare).toBeCloseTo(200 / 280)
    expect(report.storeCount).toBe(2)
    expect(report.byCategory[0].category).toBe('vegetables')
    expect(report.trustedShare).toBeCloseTo(0.5)
  })

  it('показывает, скольким семьям хватает бюджета', () => {
    const snapshot = budgetSnapshot({
      pool: 480_000,
      programs: [program],
      activeLimits: [8000, 5500, 6500],
      spent: 120_000,
    })
    expect(snapshot.familiesPossible).toBe(Math.floor(480_000 / ((8000 + 5500 + 6500) / 3)))
    expect(snapshot.freeSlots).toBe(snapshot.familiesPossible - 3)
    expect(snapshot.remaining).toBe(360_000)
  })

  it('экранирует csv и ставит разделитель для Excel', () => {
    const csv = transactionsToCsv([
      tx({
        id: '1',
        createdAt: new Date(2026, 5, 10).getTime(),
        certDebit: 10,
        storeName: 'Магазин "Северный"',
      }),
    ])
    expect(csv.startsWith('\uFEFFДата;')).toBe(true)
    expect(csv).toContain('"Магазин ""Северный"""')
    expect(csv).toContain('Молочное')
  })
})
