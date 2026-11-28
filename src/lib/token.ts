import type { TokenKind, TokenRecord } from '../types'

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export const SELF_TTL_MS = 60_000
export const TRUSTED_TTL_MS = 24 * 60 * 60 * 1000

export type TokenError = 'not_found' | 'expired' | 'used'

export function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, '')
}

export function makeCode(random: () => number = Math.random): string {
  let value = 'TK-'
  for (let index = 0; index < 8; index += 1) {
    value += ALPHABET[Math.floor(random() * ALPHABET.length)]
  }
  return value
}

export function createToken(options: {
  beneficiaryId: string
  kind: TokenKind
  now: number
  random?: () => number
  code?: string
}): TokenRecord {
  const ttl = options.kind === 'trusted' ? TRUSTED_TTL_MS : SELF_TTL_MS
  return {
    code: options.code ?? makeCode(options.random),
    beneficiaryId: options.beneficiaryId,
    kind: options.kind,
    issuedAt: options.now,
    expiresAt: options.now + ttl,
    used: false,
  }
}

export function validateToken(
  code: string,
  tokens: TokenRecord[],
  now: number,
): { ok: true; token: TokenRecord } | { ok: false; error: TokenError } {
  const normalized = normalizeCode(code)
  if (!normalized) return { ok: false, error: 'not_found' }
  const token = tokens.find((item) => item.code === normalized)
  if (!token) return { ok: false, error: 'not_found' }
  if (token.used) return { ok: false, error: 'used' }
  if (now > token.expiresAt) return { ok: false, error: 'expired' }
  return { ok: true, token }
}

export const RESERVED_CODES = new Set(['TK-EXPIREDX', 'TK-ALREADY1', 'TK-FRZNCRD1', 'TK-OLDCARD1'])

export function replaceLiveToken(tokens: TokenRecord[], next: TokenRecord): TokenRecord[] {
  const kept = tokens.filter((token) => {
    if (token.code === next.code) return false
    if (token.beneficiaryId !== next.beneficiaryId || token.kind !== next.kind) return true
    if (token.used) return true
    if (RESERVED_CODES.has(token.code)) return true
    return false
  })
  return [...kept, next]
}
