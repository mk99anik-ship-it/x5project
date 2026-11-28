import { describe, expect, it } from 'vitest'
import { createSeed } from '../data/seed'
import { loadStored, parseStored, STORAGE_KEY, writeStored } from './persist'

class Memory {
  private map = new Map<string, string>()
  get length() {
    return this.map.size
  }
  key(index: number) {
    return [...this.map.keys()][index] ?? null
  }
  getItem(key: string) {
    return this.map.get(key) ?? null
  }
  setItem(key: string, value: string) {
    this.map.set(key, value)
  }
  removeItem(key: string) {
    this.map.delete(key)
  }
}

describe('сохранённое состояние', () => {
  it('принимает текущие демо-данные', () => {
    const state = createSeed(1_700_000_000_000)
    const raw = JSON.stringify({ version: 1, state })
    expect(parseStored(raw)?.programs).toHaveLength(3)
    expect(parseStored(raw)?.beneficiaries).toHaveLength(25)
  })

  it('переносит подходящий старый ключ', () => {
    const state = createSeed(1_700_000_000_000)
    const storage = new Memory()
    storage.setItem('tihaya-kassa-v1', JSON.stringify({ version: 1, state }))
    const loaded = loadStored(storage)
    expect(loaded?.beneficiaries).toHaveLength(25)
    expect(storage.getItem(STORAGE_KEY)).toContain('"version":2')
  })

  it('сбрасывает битый снимок и не подхватывает старый ключ поверх него', () => {
    const state = createSeed(1_700_000_000_000)
    const storage = new Memory()
    storage.setItem(STORAGE_KEY, '{')
    storage.setItem('tihaya-kassa-v1', JSON.stringify({ version: 1, state }))
    expect(loadStored(storage)).toBeNull()
    expect(storage.getItem(STORAGE_KEY)).toBeNull()
    expect(storage.getItem('tihaya-kassa-v1')).toContain('"version":1')
  })

  it('отклоняет состояние без полей, без которых экран падает', () => {
    const state = createSeed(1_700_000_000_000)
    const broken = {
      ...state,
      beneficiaries: state.beneficiaries.map((person) => ({ ...person, extraByPeriod: undefined })),
    }
    expect(parseStored(JSON.stringify({ version: 1, state: broken }))).toBeNull()
    expect(parseStored(JSON.stringify({ version: 1, state: { ...state, transactions: null } }))).toBeNull()
    expect(parseStored('не json')).toBeNull()
    expect(parseStored(JSON.stringify({ version: 3, state }))).toBeNull()
  })

  it('записывает вторую версию', () => {
    const storage = new Memory()
    const state = createSeed(1_700_000_000_000)
    writeStored(state, storage)
    expect(storage.getItem(STORAGE_KEY)).toContain('"version":2')
  })
})
