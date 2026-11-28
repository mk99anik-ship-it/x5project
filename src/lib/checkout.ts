import type { Beneficiary, LineInput, Program, StoreState, Transaction } from '../types'
import { accountOf } from './account'
import { addMonths, periodKey } from './period'
import { splitReceipt, type SplitResult } from './split'
import { normalizeCode, validateToken } from './token'

export type PayError =
  | 'not_found'
  | 'expired'
  | 'used'
  | 'frozen'
  | 'revoked'
  | 'expired_card'
  | 'empty'
  | 'bad_card'

export type PaySuccess = {
  ok: true
  transaction: Transaction
  split: SplitResult
  state: StoreState
}

export type PayFailure = { ok: false; error: PayError }

export function rulesOf(program: Program) {
  return {
    allowed: program.allowed,
    forbidden: program.forbidden,
    caps: program.caps,
    multipliers: program.multipliers,
  }
}

export function checkout(options: {
  state: StoreState
  code: string
  storeId: string
  storeName: string
  items: LineInput[]
  now: number
  receiptId: string
}): PaySuccess | PayFailure {
  const items = options.items.filter((item) => item.qty > 0 && item.unitPrice > 0)
  if (items.length === 0) return { ok: false, error: 'empty' }

  const tokenResult = validateToken(options.code, options.state.tokens, options.now)
  if (!tokenResult.ok) return tokenResult

  const beneficiary = options.state.beneficiaries.find((item) => item.id === tokenResult.token.beneficiaryId)
  if (!beneficiary) return { ok: false, error: 'bad_card' }
  if (beneficiary.status === 'frozen') return { ok: false, error: 'frozen' }
  if (beneficiary.status === 'revoked') return { ok: false, error: 'revoked' }
  if (beneficiary.validUntil < options.now) return { ok: false, error: 'expired_card' }

  const program = options.state.programs.find((item) => item.id === beneficiary.programId)
  if (!program) return { ok: false, error: 'bad_card' }

  const account = accountOf(beneficiary, program, options.state.transactions, options.now)
  const split = splitReceipt({
    items,
    rules: rulesOf(program),
    balance: account.balance,
    spentByCategory: account.spentByCategory,
  })

  const transaction: Transaction = {
    id: options.receiptId,
    beneficiaryId: beneficiary.id,
    programId: program.id,
    storeId: options.storeId,
    storeName: options.storeName,
    createdAt: options.now,
    items: split.lines.map((line) => ({
      productId: line.productId,
      name: line.name,
      category: line.category,
      qty: line.qty,
      unitPrice: line.unitPrice,
      certDebit: line.certDebit,
      certGross: line.certGross,
      cash: line.cash,
    })),
    certDebit: split.certDebit,
    certGross: split.certGross,
    cash: split.cash,
    tokenCode: tokenResult.token.code,
    via: tokenResult.token.kind,
  }

  const normalized = normalizeCode(options.code)
  const state: StoreState = {
    ...options.state,
    tokens: options.state.tokens.map((token) =>
      token.code === normalized ? { ...token, used: true } : token,
    ),
    transactions: [...options.state.transactions, transaction],
  }

  return { ok: true, transaction, split, state }
}

export function applyTopUp(beneficiary: Beneficiary, amount: number, now: number): Beneficiary {
  const period = periodKey(now)
  const current = beneficiary.extraByPeriod[period] ?? 0
  return {
    ...beneficiary,
    extraByPeriod: {
      ...beneficiary.extraByPeriod,
      [period]: Math.round((current + amount) * 100) / 100,
    },
  }
}

export function nextBeneficiaryId(existing: string[]): string {
  const used = new Set(existing)
  let number = 1000 + existing.length
  let id = ''
  do {
    number += 1
    id = `ПК-${number}`
  } while (used.has(id))
  return id
}

export function createBeneficiary(program: Program, id: string, now: number): Beneficiary {
  return {
    id,
    programId: program.id,
    issuedAt: now,
    validUntil: addMonths(now, program.validityMonths),
    status: 'active',
    extraByPeriod: {},
  }
}
