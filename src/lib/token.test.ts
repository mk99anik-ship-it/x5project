import { describe, expect, it } from 'vitest'
import { createToken, makeCode, normalizeCode, SELF_TTL_MS, TRUSTED_TTL_MS, validateToken } from './token'

describe('token', () => {
  const now = 1_700_000_000_000

  it('нормализует код и принимает живой код', () => {
    const token = createToken({ beneficiaryId: 'ПК-1001', kind: 'self', now, code: 'TK-ABCD2345' })
    expect(token.expiresAt - token.issuedAt).toBe(SELF_TTL_MS)
    const result = validateToken('  tk-abcd2345 ', [token], now + 10_000)
    expect(result.ok).toBe(true)
  })

  it('отличает доверенный код по сроку жизни', () => {
    const token = createToken({ beneficiaryId: 'ПК-1001', kind: 'trusted', now, code: 'TK-TRUSTED1' })
    expect(token.expiresAt - token.issuedAt).toBe(TRUSTED_TTL_MS)
  })

  it('отклоняет пустой, неизвестный, просроченный и повторный код', () => {
    const token = createToken({ beneficiaryId: 'ПК-1001', kind: 'self', now, code: 'TK-LIVECODE' })
    expect(validateToken('   ', [token], now).ok).toBe(false)
    expect(validateToken('TK-NOPE1234', [token], now)).toEqual({ ok: false, error: 'not_found' })
    expect(validateToken(token.code, [token], token.expiresAt + 1)).toEqual({ ok: false, error: 'expired' })
    expect(validateToken(token.code, [{ ...token, used: true }], now + 1000)).toEqual({ ok: false, error: 'used' })
  })

  it('собирает код из безопасного алфавита', () => {
    const code = makeCode(() => 0)
    expect(code).toMatch(/^TK-[A-Z2-9]{8}$/)
    expect(normalizeCode('tk-aa')).toBe('TK-AA')
  })
})
