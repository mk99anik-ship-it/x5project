import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { SHOPS, shopLabel } from '../data/catalog'
import { createSeed } from '../data/seed'
import { applyTopUp, checkout, createBeneficiary, nextBeneficiaryId, type PayFailure, type PaySuccess } from '../lib/checkout'
import { createToken, replaceLiveToken, RESERVED_CODES } from '../lib/token'
import { loadStored, parseStored, STORAGE_KEY, writeStored } from './persist'
import {
  CATEGORIES,
  isHardForbidden,
  type Beneficiary,
  type BeneficiaryStatus,
  type LineInput,
  type Program,
  type StoreState,
  type TokenRecord,
} from '../types'

function cryptoRandom(): number {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return buf[0] / 4294967296
}

export function normalizeProgram(program: Program): Program {
  const allowed = program.allowed.filter((category) => !isHardForbidden(category))
  const forbidden = CATEGORIES.filter((category) => !allowed.includes(category))
  return {
    ...program,
    name: program.name.trim(),
    description: program.description.trim(),
    monthlyLimit: Math.max(0, Math.round(program.monthlyLimit)),
    validityMonths: Math.max(1, Math.round(program.validityMonths)),
    allowed,
    forbidden,
    caps: program.caps.filter((cap) => cap.periodCap > 0 && allowed.includes(cap.category)),
    multipliers: program.multipliers.filter(
      (item) => item.multiplier > 1 && allowed.includes(item.category),
    ),
  }
}

function loadOrSeed(): StoreState {
  const existing = loadStored()
  if (existing) return existing
  const fresh = createSeed(Date.now())
  writeStored(fresh)
  return fresh
}

function nextReceiptId(state: StoreState): string {
  let max = 5000
  for (const tx of state.transactions) {
    const value = Number(tx.id.replace(/\D/g, ''))
    if (Number.isFinite(value)) max = Math.max(max, value)
  }
  return `ЧК-${max + 1}`
}

function liveSelf(state: StoreState, beneficiaryId: string, now: number): TokenRecord | undefined {
  return state.tokens.find(
    (token) =>
      token.beneficiaryId === beneficiaryId &&
      token.kind === 'self' &&
      !token.used &&
      token.expiresAt > now + 1500 &&
      !RESERVED_CODES.has(token.code),
  )
}

export type EdgeKind = 'expired' | 'used' | 'frozen' | 'expired_card'

type StoreApi = {
  state: StoreState
  reset: () => void
  saveProgram: (program: Program) => Program | null
  issue: (programId: string) => Beneficiary | null
  topUp: (id: string, amount: number) => void
  setStatus: (id: string, status: BeneficiaryStatus) => void
  ensureSelfToken: (id: string) => string | null
  issueTrusted: (id: string) => TokenRecord | null
  pay: (input: { code: string; storeId: string; items: LineInput[] }) => PaySuccess | PayFailure
  edgeCode: (kind: EdgeKind) => string
}

const StoreContext = createContext<StoreApi | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoreState>(() => loadOrSeed())
  const ref = useRef(state)
  ref.current = state

  const commit = useCallback((next: StoreState) => {
    ref.current = next
    writeStored(next)
    setState(next)
  }, [])

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || !event.newValue) return
      const parsed = parseStored(event.newValue)
      if (!parsed) return
      ref.current = parsed
      setState(parsed)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const api = useMemo<StoreApi>(() => {
    return {
      state,
      reset: () => commit(createSeed(Date.now())),
      saveProgram: (program) => {
        const current = ref.current
        const normalized = normalizeProgram(program)
        if (!normalized.name || normalized.monthlyLimit < 500 || normalized.allowed.length === 0) return null
        const id = normalized.id || `prog-${Math.floor(cryptoRandom() * 1e9).toString(36)}`
        const nextProgram = { ...normalized, id }
        const programs = current.programs.some((item) => item.id === id)
          ? current.programs.map((item) => (item.id === id ? nextProgram : item))
          : [...current.programs, nextProgram]
        commit({ ...current, programs })
        return nextProgram
      },
      issue: (programId) => {
        const current = ref.current
        const program = current.programs.find((item) => item.id === programId)
        if (!program) return null
        const person = createBeneficiary(
          program,
          nextBeneficiaryId(current.beneficiaries.map((item) => item.id)),
          Date.now(),
        )
        commit({ ...current, beneficiaries: [person, ...current.beneficiaries] })
        return person
      },
      topUp: (id, amount) => {
        const value = Math.round(amount * 100) / 100
        if (!(value > 0) || value > 50000) return
        const now = Date.now()
        const current = ref.current
        commit({
          ...current,
          beneficiaries: current.beneficiaries.map((person) =>
            person.id === id ? applyTopUp(person, value, now) : person,
          ),
        })
      },
      setStatus: (id, status) => {
        const current = ref.current
        commit({
          ...current,
          beneficiaries: current.beneficiaries.map((person) =>
            person.id === id ? { ...person, status } : person,
          ),
        })
      },
      ensureSelfToken: (id) => {
        const now = Date.now()
        const current = ref.current
        const person = current.beneficiaries.find((item) => item.id === id)
        if (!person || person.status !== 'active' || person.validUntil < now) return null
        const existing = liveSelf(current, id, now)
        if (existing) return existing.code
        const next = createToken({ beneficiaryId: id, kind: 'self', now, random: cryptoRandom })
        commit({ ...current, tokens: replaceLiveToken(current.tokens, next) })
        return next.code
      },
      issueTrusted: (id) => {
        const now = Date.now()
        const current = ref.current
        const person = current.beneficiaries.find((item) => item.id === id)
        if (!person || person.status !== 'active' || person.validUntil < now) return null
        const next = createToken({ beneficiaryId: id, kind: 'trusted', now, random: cryptoRandom })
        commit({ ...current, tokens: replaceLiveToken(current.tokens, next) })
        return next
      },
      pay: ({ code, storeId, items }) => {
        const current = ref.current
        const shop = SHOPS.find((item) => item.id === storeId) ?? SHOPS[0]
        const result = checkout({
          state: current,
          code,
          storeId: shop.id,
          storeName: shopLabel(shop),
          items,
          now: Date.now(),
          receiptId: nextReceiptId(current),
        })
        if (result.ok) commit(result.state)
        return result
      },
      edgeCode: (kind) => {
        const now = Date.now()
        const current = ref.current
        const active = current.beneficiaries.find((person) => person.status === 'active' && person.validUntil >= now)
        const frozen = current.beneficiaries.find((person) => person.status === 'frozen')
        const old = current.beneficiaries.find((person) => person.status === 'active' && person.validUntil < now)
        let token: TokenRecord | null = null
        if (kind === 'expired' && active) {
          token = {
            code: 'TK-EXPIREDX',
            beneficiaryId: active.id,
            kind: 'self',
            issuedAt: now - 180_000,
            expiresAt: now - 1000,
            used: false,
          }
        }
        if (kind === 'used' && active) {
          token = {
            code: 'TK-ALREADY1',
            beneficiaryId: active.id,
            kind: 'self',
            issuedAt: now - 10_000,
            expiresAt: now + 600_000,
            used: true,
          }
        }
        if (kind === 'frozen' && frozen) {
          token = {
            code: 'TK-FRZNCRD1',
            beneficiaryId: frozen.id,
            kind: 'self',
            issuedAt: now,
            expiresAt: now + 3_600_000,
            used: false,
          }
        }
        if (kind === 'expired_card' && old) {
          token = {
            code: 'TK-OLDCARD1',
            beneficiaryId: old.id,
            kind: 'self',
            issuedAt: now,
            expiresAt: now + 3_600_000,
            used: false,
          }
        }
        if (!token) return ''
        const nextToken = token
        commit({
          ...current,
          tokens: [...current.tokens.filter((item) => item.code !== nextToken.code), nextToken],
        })
        return nextToken.code
      },
    }
  }, [commit, state])

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>
}

export function useStore(): StoreApi {
  const value = useContext(StoreContext)
  if (!value) throw new Error('store')
  return value
}
