export type FlagCode = 'burst' | 'velocity' | 'store_hop' | 'unusual_store' | 'limit_drain'

export type FraudFlag = {
  beneficiaryId: string
  code: FlagCode
  at: number
  storeId?: string
}

export type FraudTx = {
  beneficiaryId: string
  storeId: string
  createdAt: number
  certDebit: number
}

const HALF_HOUR = 30 * 60 * 1000
const DAY = 24 * 60 * 60 * 1000
const WEEK = 7 * DAY
const TWO_WEEKS = 14 * DAY
const TWO_MONTHS = 60 * DAY

export function analyzeFraud(options: {
  transactions: FraudTx[]
  limits: Record<string, number>
  now: number
}): FraudFlag[] {
  const byPerson = new Map<string, FraudTx[]>()
  for (const tx of options.transactions) {
    const list = byPerson.get(tx.beneficiaryId) ?? []
    list.push(tx)
    byPerson.set(tx.beneficiaryId, list)
  }

  const flags: FraudFlag[] = []
  for (const [beneficiaryId, list] of byPerson) {
    const sorted = [...list].sort((a, b) => a.createdAt - b.createdAt)
    const recent = sorted.filter((tx) => options.now - tx.createdAt <= TWO_MONTHS)

    let burstAt: FraudTx | null = null
    for (let index = 1; index < recent.length; index += 1) {
      const gap = recent[index].createdAt - recent[index - 1].createdAt
      if (gap >= 0 && gap <= HALF_HOUR) burstAt = recent[index]
    }
    if (burstAt) {
      flags.push({ beneficiaryId, code: 'burst', at: burstAt.createdAt, storeId: burstAt.storeId })
    }

    let velocityAt: FraudTx | null = null
    for (let index = 0; index < recent.length; index += 1) {
      const windowStart = recent[index].createdAt - DAY
      let count = 0
      for (let inner = index; inner >= 0; inner -= 1) {
        if (recent[inner].createdAt >= windowStart) count += 1
      }
      if (count >= 3) velocityAt = recent[index]
    }
    if (velocityAt) {
      flags.push({
        beneficiaryId,
        code: 'velocity',
        at: velocityAt.createdAt,
        storeId: velocityAt.storeId,
      })
    }

    const week = recent.filter((tx) => options.now - tx.createdAt <= WEEK)
    const stores = new Set(week.map((tx) => tx.storeId))
    if (stores.size >= 3 && week.length > 0) {
      const last = week[week.length - 1]
      flags.push({ beneficiaryId, code: 'store_hop', at: last.createdAt, storeId: last.storeId })
    }

    const history = recent.filter((tx) => options.now - tx.createdAt <= TWO_MONTHS)
    if (history.length >= 6) {
      const counts = new Map<string, number>()
      for (const tx of history) counts.set(tx.storeId, (counts.get(tx.storeId) ?? 0) + 1)
      let dominant = ''
      let dominantCount = 0
      for (const [storeId, count] of counts) {
        if (count > dominantCount) {
          dominant = storeId
          dominantCount = count
        }
      }
      if (dominantCount / history.length >= 0.5) {
        const odd = [...history]
          .reverse()
          .find((tx) => options.now - tx.createdAt <= TWO_WEEKS && (counts.get(tx.storeId) ?? 0) === 1)
        if (odd && odd.storeId !== dominant) {
          flags.push({
            beneficiaryId,
            code: 'unusual_store',
            at: odd.createdAt,
            storeId: odd.storeId,
          })
        }
      }
    }

    const limit = options.limits[beneficiaryId] ?? 0
    if (limit > 0) {
      const drained = [...recent].reverse().find((tx) => tx.certDebit >= limit * 0.85)
      if (drained) {
        flags.push({
          beneficiaryId,
          code: 'limit_drain',
          at: drained.createdAt,
          storeId: drained.storeId,
        })
      }
    }
  }

  return flags.sort((a, b) => b.at - a.at)
}

export const FLAG_TEXT: Record<FlagCode, string> = {
  burst: 'Две покупки с интервалом меньше 30 минут',
  velocity: 'Три и больше покупок за 24 часа',
  store_hop: 'Три и больше разных магазинов за 7 дней',
  unusual_store: 'Покупка в магазине, где человек почти не бывает',
  limit_drain: 'Одна покупка списала больше 85% месячного лимита',
}

export const FLAG_LEVEL: Record<FlagCode, 'high' | 'medium' | 'low'> = {
  burst: 'high',
  velocity: 'high',
  store_hop: 'medium',
  limit_drain: 'medium',
  unusual_store: 'low',
}
