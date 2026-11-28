import { describe, expect, it } from 'vitest'
import type { Category, LineInput } from '../types'
import { mulberry32 } from './rng'
import { splitReceipt, type Rules } from './split'

const rules: Rules = {
  allowed: ['vegetables', 'fruits', 'dairy', 'meat', 'bakery', 'grocery', 'baby', 'drinks', 'sweets'],
  forbidden: ['alcohol', 'tobacco', 'household'],
  caps: [{ category: 'sweets', periodCap: 100 }],
  multipliers: [
    { category: 'vegetables', multiplier: 1.3 },
    { category: 'dairy', multiplier: 1.2 },
    { category: 'baby', multiplier: 1.5 },
  ],
}

function item(partial: Partial<LineInput> & Pick<LineInput, 'category' | 'unitPrice'>): LineInput {
  return {
    productId: partial.productId ?? partial.category,
    name: partial.name ?? partial.category,
    qty: partial.qty ?? 1,
    category: partial.category,
    unitPrice: partial.unitPrice,
  }
}

describe('splitReceipt', () => {
  it('отправляет алкоголь и табак в обычную оплату даже если категория разрешена', () => {
    const open: Rules = { ...rules, allowed: [...rules.allowed, 'alcohol', 'tobacco'], forbidden: [] }
    const result = splitReceipt({
      items: [item({ category: 'alcohol', unitPrice: 89 }), item({ category: 'tobacco', unitPrice: 210 })],
      rules: open,
      balance: 5000,
      spentByCategory: {},
    })
    expect(result.certDebit).toBe(0)
    expect(result.cash).toBe(299)
    expect(result.lines.every((line) => line.reason === 'forbidden')).toBe(true)
  })

  it('не оплачивает баллами категорию вне программы', () => {
    const result = splitReceipt({
      items: [item({ category: 'household', unitPrice: 129 })],
      rules,
      balance: 5000,
      spentByCategory: {},
    })
    expect(result.lines[0].reason).toBe('forbidden')
    expect(result.cash).toBe(129)
  })

  it('списывает овощи с коэффициентом 1,3: 130 ₽ стоят 100 баллов', () => {
    const result = splitReceipt({
      items: [item({ category: 'vegetables', unitPrice: 130 })],
      rules,
      balance: 5000,
      spentByCategory: {},
    })
    expect(result.certGross).toBe(130)
    expect(result.certDebit).toBe(100)
    expect(result.cash).toBe(0)
    expect(result.lines[0].outcome).toBe('points')
  })

  it('режет чек по остатку баллов и отправляет хвост в доплату', () => {
    const result = splitReceipt({
      items: [item({ category: 'grocery', unitPrice: 80 }), item({ category: 'bakery', unitPrice: 50 })],
      rules,
      balance: 100,
      spentByCategory: {},
    })
    expect(result.certDebit).toBe(100)
    expect(result.certGross).toBe(100)
    expect(result.cash).toBe(30)
    expect(result.lines[0].outcome).toBe('points')
    expect(result.lines[1].reason).toBe('balance')
    expect(result.lines[1].certGross).toBe(20)
    expect(result.lines[1].cash).toBe(30)
  })

  it('учитывает потолок категории и уже потраченное за период', () => {
    const first = splitReceipt({
      items: [item({ category: 'sweets', unitPrice: 80 }), item({ category: 'sweets', unitPrice: 40, productId: 'b' })],
      rules,
      balance: 5000,
      spentByCategory: {},
    })
    expect(first.lines[0].certGross).toBe(80)
    expect(first.lines[1].certGross).toBe(20)
    expect(first.lines[1].cash).toBe(20)
    expect(first.lines[1].reason).toBe('cap')

    const next = splitReceipt({
      items: [item({ category: 'sweets', unitPrice: 50 })],
      rules,
      balance: 5000,
      spentByCategory: { sweets: 90 },
    })
    expect(next.certGross).toBe(10)
    expect(next.cash).toBe(40)
  })

  it('сохраняет сумму строки и не списывает больше остатка', () => {
    const rng = mulberry32(7)
    const categories: Category[] = ['vegetables', 'dairy', 'grocery', 'sweets', 'alcohol', 'household', 'baby']
    for (let round = 0; round < 40; round += 1) {
      const items = Array.from({ length: 4 }, (_, index) =>
        item({
          productId: `p${index}`,
          category: categories[Math.floor(rng() * categories.length)],
          unitPrice: 20 + Math.floor(rng() * 180),
          qty: 1 + Math.floor(rng() * 3),
        }),
      )
      const balance = Math.floor(rng() * 400)
      const result = splitReceipt({ items, rules, balance, spentByCategory: { sweets: 40 } })
      expect(result.certDebit).toBeLessThanOrEqual(balance + 0.001)
      for (const line of result.lines) {
        expect(Math.round((line.certGross + line.cash) * 100)).toBe(Math.round(line.lineTotal * 100))
      }
    }
  })
})
