import { describe, expect, it } from 'vitest'
import { analyzeFraud, type FraudTx } from './fraud'

const now = new Date(2026, 5, 15, 12, 0, 0).getTime()
const DAY = 24 * 60 * 60 * 1000

function tx(partial: Partial<FraudTx> & Pick<FraudTx, 'createdAt'>): FraudTx {
  return {
    beneficiaryId: 'ПК-1',
    storeId: 's1',
    certDebit: 200,
    ...partial,
  }
}

describe('analyzeFraud', () => {
  it('отмечает частые покупки, смену магазинов, необычный магазин и слив лимита', () => {
    const transactions: FraudTx[] = [
      tx({ createdAt: now - 40 * 60 * 1000 }),
      tx({ createdAt: now - 20 * 60 * 1000 }),
      tx({ createdAt: now - 8 * 60 * 1000 }),
      tx({ beneficiaryId: 'ПК-2', storeId: 's1', createdAt: now - 5 * DAY }),
      tx({ beneficiaryId: 'ПК-2', storeId: 's2', createdAt: now - 4 * DAY }),
      tx({ beneficiaryId: 'ПК-2', storeId: 's3', createdAt: now - 2 * DAY }),
      tx({ beneficiaryId: 'ПК-3', storeId: 's1', createdAt: now - 50 * DAY }),
      tx({ beneficiaryId: 'ПК-3', storeId: 's1', createdAt: now - 40 * DAY }),
      tx({ beneficiaryId: 'ПК-3', storeId: 's1', createdAt: now - 30 * DAY }),
      tx({ beneficiaryId: 'ПК-3', storeId: 's1', createdAt: now - 20 * DAY }),
      tx({ beneficiaryId: 'ПК-3', storeId: 's1', createdAt: now - 12 * DAY }),
      tx({ beneficiaryId: 'ПК-3', storeId: 's9', createdAt: now - 2 * DAY, certDebit: 100 }),
      tx({ beneficiaryId: 'ПК-4', storeId: 's1', createdAt: now - 3 * DAY, certDebit: 900 }),
    ]
    const flags = analyzeFraud({
      transactions,
      limits: { 'ПК-1': 5000, 'ПК-2': 5000, 'ПК-3': 5000, 'ПК-4': 1000 },
      now,
    })
    const codes = (id: string) => flags.filter((flag) => flag.beneficiaryId === id).map((flag) => flag.code)
    expect(codes('ПК-1')).toEqual(expect.arrayContaining(['burst', 'velocity']))
    expect(codes('ПК-2')).toContain('store_hop')
    expect(codes('ПК-3')).toContain('unusual_store')
    expect(codes('ПК-4')).toContain('limit_drain')
  })

  it('не поднимает флаг на обычную единственную покупку', () => {
    const flags = analyzeFraud({
      transactions: [tx({ createdAt: now - 2 * DAY, certDebit: 300 })],
      limits: { 'ПК-1': 5000 },
      now,
    })
    expect(flags).toHaveLength(0)
  })
})
