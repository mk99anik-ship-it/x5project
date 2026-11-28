import { describe, expect, it } from 'vitest'
import type { Program, StoreState } from '../types'
import { accountOf } from './account'
import { checkout, createBeneficiary } from './checkout'
import { createToken } from './token'

const now = new Date(2026, 5, 15, 12, 0, 0).getTime()

const program: Program = {
  id: 'prog-family',
  name: 'Семьи с детьми',
  description: '',
  monthlyLimit: 1000,
  validityMonths: 6,
  allowed: ['dairy', 'grocery', 'sweets', 'vegetables'],
  forbidden: ['alcohol', 'tobacco', 'household'],
  caps: [{ category: 'sweets', periodCap: 100 }],
  multipliers: [{ category: 'dairy', multiplier: 1.2 }],
}

function baseState(patch?: Partial<StoreState>): StoreState {
  const person = createBeneficiary(program, 'ПК-2001', now - 1000)
  const token = createToken({ beneficiaryId: person.id, kind: 'self', now, code: 'TK-TESTCODE' })
  return {
    pool: 10000,
    programs: [program],
    beneficiaries: [person],
    transactions: [],
    tokens: [token],
    ...patch,
  }
}

describe('checkout', () => {
  it('принимает постоянный номер карты и уменьшает остаток', () => {
    const state = baseState()
    const result = checkout({
      state,
      code: 'пк-2001',
      storeId: 's1',
      storeName: 'Пятёрочка, ул. Лесная, 12',
      now: now + 1000,
      receiptId: 'ЧК-1',
      items: [
        { productId: 'milk', name: 'Молоко', category: 'dairy', unitPrice: 100, qty: 1 },
        { productId: 'beer', name: 'Пиво', category: 'alcohol', unitPrice: 90, qty: 1 },
      ],
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.split.certGross).toBe(100)
    expect(result.split.certDebit).toBe(83.33)
    expect(result.split.cash).toBe(90)
    expect(result.transaction.via).toBe('self')
    expect(result.transaction.tokenCode).toBe('ПК-2001')
    expect(result.state.tokens.find((token) => token.code === 'TK-TESTCODE')?.used).toBe(false)
    const account = accountOf(result.state.beneficiaries[0], program, result.state.transactions, now + 1000)
    expect(account.balance).toBe(916.67)

    const again = checkout({
      state: result.state,
      code: 'ПК-2001',
      storeId: 's1',
      storeName: 'Пятёрочка',
      now: now + 2000,
      receiptId: 'ЧК-2',
      items: [{ productId: 'rice', name: 'Рис', category: 'grocery', unitPrice: 50, qty: 1 }],
    })
    expect(again.ok).toBe(true)
  })

  it('не проводит замороженную, отозванную и просроченную карту', () => {
    const frozen = baseState()
    frozen.beneficiaries[0].status = 'frozen'
    expect(
      checkout({
        state: frozen,
        code: 'ПК-2001',
        storeId: 's1',
        storeName: 'Магазин',
        now: now + 1000,
        receiptId: 'ЧК-3',
        items: [{ productId: 'rice', name: 'Рис', category: 'grocery', unitPrice: 50, qty: 1 }],
      }),
    ).toMatchObject({ ok: false, error: 'frozen' })
    expect(frozen.tokens[0].used).toBe(false)

    const revoked = baseState()
    revoked.beneficiaries[0].status = 'revoked'
    expect(
      checkout({
        state: revoked,
        code: 'ПК-2001',
        storeId: 's1',
        storeName: 'Магазин',
        now: now + 1000,
        receiptId: 'ЧК-4',
        items: [{ productId: 'rice', name: 'Рис', category: 'grocery', unitPrice: 50, qty: 1 }],
      }),
    ).toMatchObject({ ok: false, error: 'revoked' })

    const expired = baseState()
    expired.beneficiaries[0].validUntil = now - 1
    expect(
      checkout({
        state: expired,
        code: 'ПК-2001',
        storeId: 's1',
        storeName: 'Магазин',
        now: now + 1000,
        receiptId: 'ЧК-5',
        items: [{ productId: 'rice', name: 'Рис', category: 'grocery', unitPrice: 50, qty: 1 }],
      }),
    ).toMatchObject({ ok: false, error: 'expired_card' })
  })

  it('одноразовый код родственника сгорает, номер карты нет', () => {
    const state = baseState()
    state.tokens[0] = createToken({ beneficiaryId: 'ПК-2001', kind: 'trusted', now, code: 'TK-TRUSTED1' })
    const paid = checkout({
      state,
      code: 'TK-TRUSTED1',
      storeId: 's1',
      storeName: 'Магазин',
      now: now + 1000,
      receiptId: 'ЧК-6',
      items: [{ productId: 'rice', name: 'Рис', category: 'grocery', unitPrice: 50, qty: 1 }],
    })
    expect(paid.ok).toBe(true)
    if (!paid.ok) return
    expect(paid.transaction.via).toBe('trusted')
    expect(
      checkout({
        state: paid.state,
        code: 'TK-TRUSTED1',
        storeId: 's1',
        storeName: 'Магазин',
        now: now + 2000,
        receiptId: 'ЧК-6b',
        items: [{ productId: 'rice', name: 'Рис', category: 'grocery', unitPrice: 50, qty: 1 }],
      }),
    ).toMatchObject({ ok: false, error: 'used' })
    const expired = baseState()
    expired.tokens[0] = createToken({ beneficiaryId: 'ПК-2001', kind: 'trusted', now: now - 10_000, code: 'TK-OLDTRUST' })
    expired.tokens[0].expiresAt = now - 1
    expect(
      checkout({
        state: expired,
        code: 'TK-OLDTRUST',
        storeId: 's1',
        storeName: 'Магазин',
        now,
        receiptId: 'ЧК-6c',
        items: [{ productId: 'rice', name: 'Рис', category: 'grocery', unitPrice: 50, qty: 1 }],
      }),
    ).toMatchObject({ ok: false, error: 'expired' })
    expect(
      checkout({
        state,
        code: 'ПК-2001',
        storeId: 's1',
        storeName: 'Магазин',
        now: now + 1000,
        receiptId: 'ЧК-7',
        items: [],
      }),
    ).toMatchObject({ ok: false, error: 'empty' })
    expect(
      checkout({
        state,
        code: 'ПК-0000',
        storeId: 's1',
        storeName: 'Магазин',
        now,
        receiptId: 'ЧК-8',
        items: [{ productId: 'rice', name: 'Рис', category: 'grocery', unitPrice: 50, qty: 1 }],
      }),
    ).toMatchObject({ ok: false, error: 'not_found' })
  })

  it('не переносит траты прошлого месяца в текущий остаток', () => {
    const state = baseState()
    const previous = new Date(2026, 4, 20, 12).getTime()
    state.transactions.push({
      id: 'ЧК-0',
      beneficiaryId: 'ПК-2001',
      programId: program.id,
      storeId: 's1',
      storeName: 'Магазин',
      createdAt: previous,
      items: [],
      certDebit: 900,
      certGross: 900,
      cash: 0,
      tokenCode: 'TK-OLD',
      via: 'self',
    })
    const account = accountOf(state.beneficiaries[0], program, state.transactions, now)
    expect(account.balance).toBe(1000)
    expect(account.spent).toBe(0)
  })
})
