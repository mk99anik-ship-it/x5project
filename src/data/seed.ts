import { lineFromProduct, productById, PRODUCTS, SHOPS, shopLabel } from './catalog'
import { HARD_FORBIDDEN, type Beneficiary, type Category, type LineInput, type Program, type StoreState, type Transaction } from '../types'
import { rulesOf } from '../lib/checkout'
import { mulberry32 } from '../lib/rng'
import { periodKey } from '../lib/period'
import { splitReceipt } from '../lib/split'
import type { Shop } from '../types'

const DAY = 24 * 60 * 60 * 1000
export const DEMO_POOL = 480_000

const FOOD: Category[] = ['vegetables', 'fruits', 'dairy', 'meat', 'fish', 'bakery', 'grocery', 'drinks']

export function demoPrograms(): Program[] {
  return [
    {
      id: 'prog-family',
      name: 'Семьи с детьми',
      description: 'Для семей с детьми. Детское питание, овощи и молоко списывают меньше баллов. На сладкое есть предел.',
      monthlyLimit: 8000,
      validityMonths: 6,
      allowed: [...FOOD, 'baby', 'sweets'],
      forbidden: ['alcohol', 'tobacco', 'household'],
      caps: [{ category: 'sweets', periodCap: 800 }],
      multipliers: [
        { category: 'vegetables', multiplier: 1.3 },
        { category: 'fruits', multiplier: 1.2 },
        { category: 'dairy', multiplier: 1.2 },
        { category: 'baby', multiplier: 1.5 },
      ],
    },
    {
      id: 'prog-senior',
      name: 'Пожилые',
      description: 'Овощи, молоко и рыба списывают меньше баллов.',
      monthlyLimit: 5500,
      validityMonths: 12,
      allowed: [...FOOD, 'sweets'],
      forbidden: ['alcohol', 'tobacco', 'household', 'baby'],
      caps: [{ category: 'sweets', periodCap: 400 }],
      multipliers: [
        { category: 'vegetables', multiplier: 1.4 },
        { category: 'dairy', multiplier: 1.3 },
        { category: 'fish', multiplier: 1.2 },
      ],
    },
    {
      id: 'prog-diabetes',
      name: 'Диабет',
      description: 'Без сладкого и сахара. Овощи, рыба и молоко списывают меньше баллов.',
      monthlyLimit: 6500,
      validityMonths: 6,
      allowed: [...FOOD],
      forbidden: ['alcohol', 'tobacco', 'household', 'sweets', 'baby'],
      caps: [],
      multipliers: [
        { category: 'vegetables', multiplier: 1.5 },
        { category: 'fish', multiplier: 1.3 },
        { category: 'dairy', multiplier: 1.2 },
      ],
    },
  ]
}

function makePeople(programs: Program[], now: number): Beneficiary[] {
  const plan = [
    { programId: 'prog-family', count: 12 },
    { programId: 'prog-senior', count: 8 },
    { programId: 'prog-diabetes', count: 5 },
  ]
  const people: Beneficiary[] = []
  for (const group of plan) {
    const program = programs.find((item) => item.id === group.programId)!
    for (let index = 0; index < group.count; index += 1) {
      const issuedAt = now - 70 * DAY
      const person: Beneficiary = {
        id: `ПК-${1001 + people.length}`,
        programId: program.id,
        issuedAt,
        validUntil: issuedAt + program.validityMonths * 30 * DAY,
        status: 'active',
        extraByPeriod: {},
      }
      people.push(person)
    }
  }
  people[4].status = 'frozen'
  people[16].status = 'frozen'
  people[22].status = 'revoked'
  people[9].validUntil = now - 5 * DAY
  return people
}

type Ledger = {
  spent: number
  byCategory: Partial<Record<Category, number>>
}

function allowedProducts(program: Program, plainOnly: boolean) {
  return PRODUCTS.filter((product) => {
    if (!program.allowed.includes(product.category) || HARD_FORBIDDEN.includes(product.category)) return false
    if (!plainOnly) return true
    const bonus = program.multipliers.find((item) => item.category === product.category)
    return !bonus || bonus.multiplier <= 1
  })
}

function addProduct(items: LineInput[], product: (typeof PRODUCTS)[number], qty = 1) {
  const existing = items.find((item) => item.productId === product.id)
  if (existing) existing.qty += qty
  else {
    items.push({
      productId: product.id,
      name: product.name,
      category: product.category,
      unitPrice: product.price,
      qty,
    })
  }
}

function randomBasket(rng: () => number, program: Program, target: number, alcohol: boolean): LineInput[] {
  const pool = allowedProducts(program, false)
  const items: LineInput[] = []
  let total = 0
  let guard = 0
  while (total < target && guard < 8) {
    const product = pool[Math.floor(rng() * pool.length)]
    addProduct(items, product, 1)
    total += product.price
    guard += 1
  }
  if (alcohol) addProduct(items, PRODUCTS.find((product) => product.id === 'beer')!, 1)
  return items
}

function pileToDebit(program: Program, targetDebit: number): LineInput[] {
  const capped = new Set(program.caps.map((cap) => cap.category))
  const pool = allowedProducts(program, true).filter((product) => !capped.has(product.category))
  const items: LineInput[] = []
  let guard = 0
  while (guard < 80) {
    const product = pool[guard % pool.length]
    addProduct(items, product, 1)
    const split = splitReceipt({
      items,
      rules: rulesOf(program),
      balance: program.monthlyLimit,
      spentByCategory: {},
    })
    if (split.certDebit >= targetDebit) return items
    guard += 1
  }
  return items
}

function pushPurchase(options: {
  txs: Transaction[]
  seq: { n: number }
  person: Beneficiary
  program: Program
  ledger: Ledger
  shop: Shop
  when: number
  items: LineInput[]
}) {
  const balance = Math.max(0, options.program.monthlyLimit - options.ledger.spent)
  if (balance <= 0) return
  const split = splitReceipt({
    items: options.items,
    rules: rulesOf(options.program),
    balance,
    spentByCategory: options.ledger.byCategory,
  })
  if (split.certDebit <= 0 && split.cash <= 0) return
  const tx: Transaction = {
    id: `ЧК-${options.seq.n}`,
    beneficiaryId: options.person.id,
    programId: options.program.id,
    storeId: options.shop.id,
    storeName: shopLabel(options.shop),
    createdAt: options.when,
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
    tokenCode: 'TK-HISTORY',
    via: 'self',
  }
  options.seq.n += 1
  options.txs.push(tx)
  options.ledger.spent = Math.round((options.ledger.spent + split.certDebit) * 100) / 100
  for (const line of split.lines) {
    options.ledger.byCategory[line.category] =
      Math.round(((options.ledger.byCategory[line.category] ?? 0) + line.certGross) * 100) / 100
  }
}

function dateInMonth(rng: () => number, now: number, monthShift: number, notAfter: number) {
  const cursor = new Date(now)
  const start = new Date(cursor.getFullYear(), cursor.getMonth() - monthShift, 1, 10, 0, 0).getTime()
  const endMonth = new Date(cursor.getFullYear(), cursor.getMonth() - monthShift + 1, 0, 19, 0, 0).getTime()
  const end = Math.min(endMonth, notAfter)
  if (end <= start) return start
  return start + Math.floor(rng() * (end - start))
}

function makeHistory(programs: Program[], people: Beneficiary[], now: number): Transaction[] {
  const rng = mulberry32(20261128)
  const txs: Transaction[] = []
  const seq = { n: 4100 }

  people.forEach((person, index) => {
    const program = programs.find((item) => item.id === person.programId)!
    const home = SHOPS[index % SHOPS.length]
    const alt = SHOPS[(index + 3) % SHOPS.length]
    const mode =
      index === 1 ? 'burst' : index === 8 ? 'hop' : index === 14 ? 'unusual' : index === 21 ? 'drain' : 'normal'

    for (const shift of [1, 0]) {
      const ledger: Ledger = { spent: 0, byCategory: {} }
      if (mode === 'drain' && shift === 0) {
        const target = program.monthlyLimit * 0.9
        pushPurchase({
          txs,
          seq,
          person,
          program,
          ledger,
          shop: home,
          when: now - 3 * DAY,
          items: pileToDebit(program, target),
        })
        continue
      }

      const count = mode === 'burst' && shift === 0 ? 2 : mode === 'hop' && shift === 0 ? 2 : 3 + Math.floor(rng() * 3)
      const targetShare = mode === 'normal' ? 0.48 + rng() * 0.27 : 0.4 + rng() * 0.15
      for (let n = 0; n < count; n += 1) {
        const latest = mode === 'burst' && shift === 0 ? now - 2 * DAY : mode === 'hop' && shift === 0 ? now - 8 * DAY : now - 4 * 60 * 60 * 1000
        const when = dateInMonth(rng, now, shift, Math.min(latest, person.validUntil - 60 * 1000, now))
        if (when > now || when > person.validUntil) continue
        let shop = rng() < 0.74 ? home : alt
        if (mode === 'unusual' || mode === 'drain' || mode === 'burst') shop = home
        if (mode === 'hop') shop = SHOPS[(index + n + shift) % SHOPS.length]
        const alcohol = mode === 'normal' && rng() < 0.16
        pushPurchase({
          txs,
          seq,
          person,
          program,
          ledger,
          shop,
          when,
          items: randomBasket(rng, program, (program.monthlyLimit * targetShare) / count, alcohol),
        })
      }
    }

    const ledgerNow: Ledger = { spent: 0, byCategory: {} }
    const monthTx = txs.filter(
      (tx) => tx.beneficiaryId === person.id && periodKey(tx.createdAt) === periodKey(now),
    )
    for (const tx of monthTx) {
      ledgerNow.spent += tx.certDebit
      for (const item of tx.items) {
        ledgerNow.byCategory[item.category] = (ledgerNow.byCategory[item.category] ?? 0) + item.certGross
      }
    }

    if (mode === 'burst') {
      for (let n = 0; n < 3; n += 1) {
        pushPurchase({
          txs,
          seq,
          person,
          program,
          ledger: ledgerNow,
          shop: home,
          when: now - (42 - n * 12) * 60 * 1000,
          items: randomBasket(rng, program, 380, false),
        })
      }
    }

    if (mode === 'hop') {
      for (let n = 0; n < 4; n += 1) {
        pushPurchase({
          txs,
          seq,
          person,
          program,
          ledger: ledgerNow,
          shop: SHOPS[n],
          when: now - (5 - n) * DAY + 2 * 60 * 60 * 1000,
          items: randomBasket(rng, program, 420, false),
        })
      }
    }

    if (mode === 'unusual') {
      pushPurchase({
        txs,
        seq,
        person,
        program,
        ledger: ledgerNow,
        shop: SHOPS[(SHOPS.indexOf(home) + 1) % SHOPS.length],
        when: now - 2 * DAY,
        items: randomBasket(rng, program, 460, false),
      })
    }
  })

  return txs.sort((a, b) => a.createdAt - b.createdAt)
}

function edgeTokens(people: Beneficiary[], now: number): StoreState['tokens'] {
  const active = people.find((person) => person.status === 'active' && person.validUntil > now)!
  const frozen = people.find((person) => person.status === 'frozen')!
  const expiredCard = people.find((person) => person.status === 'active' && person.validUntil < now)!
  return [
    {
      code: 'TK-EXPIREDX',
      beneficiaryId: active.id,
      kind: 'self',
      issuedAt: now - 3 * 60 * 1000,
      expiresAt: now - 60 * 1000,
      used: false,
    },
    {
      code: 'TK-ALREADY1',
      beneficiaryId: active.id,
      kind: 'self',
      issuedAt: now - 60 * 1000,
      expiresAt: now + 10 * 60 * 1000,
      used: true,
    },
    {
      code: 'TK-FRZNCRD1',
      beneficiaryId: frozen.id,
      kind: 'self',
      issuedAt: now,
      expiresAt: now + 60 * 60 * 1000,
      used: false,
    },
    {
      code: 'TK-OLDCARD1',
      beneficiaryId: expiredCard.id,
      kind: 'self',
      issuedAt: now,
      expiresAt: now + 60 * 60 * 1000,
      used: false,
    },
  ]
}

export function createSeed(now: number): StoreState {
  const programs = demoPrograms()
  const beneficiaries = makePeople(programs, now)
  return {
    pool: DEMO_POOL,
    programs,
    beneficiaries,
    transactions: makeHistory(programs, beneficiaries, now),
    tokens: edgeTokens(beneficiaries, now),
  }
}

export const DEMO_PRODUCT_IDS = ['milk', 'buckwheat', 'apple', 'puree', 'chocolate', 'beer'] as const

export function demoLines(): LineInput[] {
  return DEMO_PRODUCT_IDS.map((id) => lineFromProduct(productById(id)!))
}
