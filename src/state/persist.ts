import {
  CATEGORIES,
  type Beneficiary,
  type Category,
  type Program,
  type StoreState,
  type TokenRecord,
  type Transaction,
  type TxItem,
} from '../types'

export const STORAGE_KEY = 'tihaya-kassa-v2'
const LEGACY_KEY = 'tihaya-kassa-v1'

const CATEGORY_SET = new Set<string>(CATEGORIES)
const STATUSES = new Set(['active', 'frozen', 'revoked'])
const VIAS = new Set(['self', 'trusted'])

type Bucket = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
  key(index: number): string | null
  readonly length: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isCategory(value: unknown): value is Category {
  return typeof value === 'string' && CATEGORY_SET.has(value)
}

function isNumberRecord(value: unknown): value is Record<string, number> {
  return isRecord(value) && Object.values(value).every(isFiniteNumber)
}

function isProgram(value: unknown): value is Program {
  if (!isRecord(value)) return false
  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.description === 'string' &&
    isFiniteNumber(value.monthlyLimit) &&
    isFiniteNumber(value.validityMonths) &&
    Array.isArray(value.allowed) &&
    value.allowed.every(isCategory) &&
    Array.isArray(value.forbidden) &&
    value.forbidden.every(isCategory) &&
    Array.isArray(value.caps) &&
    value.caps.every((cap) => isRecord(cap) && isCategory(cap.category) && isFiniteNumber(cap.periodCap)) &&
    Array.isArray(value.multipliers) &&
    value.multipliers.every((item) => isRecord(item) && isCategory(item.category) && isFiniteNumber(item.multiplier))
  )
}

function isBeneficiary(value: unknown): value is Beneficiary {
  if (!isRecord(value)) return false
  return (
    typeof value.id === 'string' &&
    typeof value.programId === 'string' &&
    isFiniteNumber(value.issuedAt) &&
    isFiniteNumber(value.validUntil) &&
    typeof value.status === 'string' &&
    STATUSES.has(value.status) &&
    isNumberRecord(value.extraByPeriod)
  )
}

function isTxItem(value: unknown): value is TxItem {
  if (!isRecord(value)) return false
  return (
    typeof value.productId === 'string' &&
    typeof value.name === 'string' &&
    isCategory(value.category) &&
    isFiniteNumber(value.qty) &&
    isFiniteNumber(value.unitPrice) &&
    isFiniteNumber(value.certDebit) &&
    isFiniteNumber(value.certGross) &&
    isFiniteNumber(value.cash)
  )
}

function isTransaction(value: unknown): value is Transaction {
  if (!isRecord(value)) return false
  return (
    typeof value.id === 'string' &&
    typeof value.beneficiaryId === 'string' &&
    typeof value.programId === 'string' &&
    typeof value.storeId === 'string' &&
    typeof value.storeName === 'string' &&
    isFiniteNumber(value.createdAt) &&
    Array.isArray(value.items) &&
    value.items.every(isTxItem) &&
    isFiniteNumber(value.certDebit) &&
    isFiniteNumber(value.certGross) &&
    isFiniteNumber(value.cash) &&
    typeof value.tokenCode === 'string' &&
    typeof value.via === 'string' &&
    VIAS.has(value.via)
  )
}

function isToken(value: unknown): value is TokenRecord {
  if (!isRecord(value)) return false
  return (
    typeof value.code === 'string' &&
    typeof value.beneficiaryId === 'string' &&
    typeof value.kind === 'string' &&
    VIAS.has(value.kind) &&
    isFiniteNumber(value.issuedAt) &&
    isFiniteNumber(value.expiresAt) &&
    typeof value.used === 'boolean'
  )
}

export function isStoreState(value: unknown): value is StoreState {
  if (!isRecord(value)) return false
  return (
    isFiniteNumber(value.pool) &&
    Array.isArray(value.programs) &&
    value.programs.length > 0 &&
    value.programs.every(isProgram) &&
    Array.isArray(value.beneficiaries) &&
    value.beneficiaries.every(isBeneficiary) &&
    Array.isArray(value.transactions) &&
    value.transactions.every(isTransaction) &&
    Array.isArray(value.tokens) &&
    value.tokens.every(isToken)
  )
}

export function parseStored(raw: string): StoreState | null {
  try {
    const parsed = JSON.parse(raw) as { version?: unknown; state?: unknown }
    if (parsed.version !== 1 && parsed.version !== 2) return null
    if (!isStoreState(parsed.state)) return null
    return parsed.state
  } catch {
    return null
  }
}

function bucket(): Bucket | null {
  try {
    return localStorage
  } catch {
    return null
  }
}

export function loadStored(storage: Bucket | null = bucket()): StoreState | null {
  if (!storage) return null
  try {
    const current = storage.getItem(STORAGE_KEY)
    if (current !== null) {
      const parsed = parseStored(current)
      if (parsed) return parsed
      storage.removeItem(STORAGE_KEY)
      return null
    }
    const legacy = storage.getItem(LEGACY_KEY)
    if (legacy === null) return null
    const parsed = parseStored(legacy)
    if (!parsed) {
      storage.removeItem(LEGACY_KEY)
      return null
    }
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, state: parsed }))
    return parsed
  } catch {
    return null
  }
}

export function writeStored(state: StoreState, storage: Bucket | null = bucket()) {
  if (!storage) return
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, state }))
  } catch {
    return
  }
}

export function clearStored() {
  const storage = bucket()
  if (!storage) return
  try {
    const keys: string[] = []
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index)
      if (key?.startsWith('tihaya-kassa')) keys.push(key)
    }
    for (const key of keys) storage.removeItem(key)
  } catch {
    return
  }
}
