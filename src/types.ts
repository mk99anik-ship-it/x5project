export const CATEGORIES = [
  'vegetables',
  'fruits',
  'dairy',
  'meat',
  'fish',
  'bakery',
  'grocery',
  'baby',
  'drinks',
  'sweets',
  'household',
  'alcohol',
  'tobacco',
] as const

export type Category = (typeof CATEGORIES)[number]

export const CATEGORY_LABELS: Record<Category, string> = {
  vegetables: 'Овощи',
  fruits: 'Фрукты',
  dairy: 'Молочное',
  meat: 'Мясо',
  fish: 'Рыба',
  bakery: 'Хлеб',
  grocery: 'Бакалея',
  baby: 'Детское питание',
  drinks: 'Напитки',
  sweets: 'Сладости',
  household: 'Бытовая химия',
  alcohol: 'Алкоголь',
  tobacco: 'Табак',
}

export const HEALTHY_CATEGORIES: Category[] = ['vegetables', 'fruits', 'dairy', 'baby', 'fish']

export const HARD_FORBIDDEN: Category[] = ['alcohol', 'tobacco']

export function isHardForbidden(category: Category): boolean {
  return category === 'alcohol' || category === 'tobacco'
}

export type BeneficiaryStatus = 'active' | 'frozen' | 'revoked'

export type Program = {
  id: string
  name: string
  description: string
  monthlyLimit: number
  validityMonths: number
  allowed: Category[]
  forbidden: Category[]
  caps: { category: Category; periodCap: number }[]
  multipliers: { category: Category; multiplier: number }[]
}

export type Beneficiary = {
  id: string
  programId: string
  issuedAt: number
  validUntil: number
  status: BeneficiaryStatus
  extraByPeriod: Record<string, number>
}

export type TxItem = {
  productId: string
  name: string
  category: Category
  qty: number
  unitPrice: number
  certDebit: number
  certGross: number
  cash: number
}

export type Transaction = {
  id: string
  beneficiaryId: string
  programId: string
  storeId: string
  storeName: string
  createdAt: number
  items: TxItem[]
  certDebit: number
  certGross: number
  cash: number
  tokenCode: string
  via: 'self' | 'trusted'
}

export type TokenKind = 'self' | 'trusted'

export type TokenRecord = {
  code: string
  beneficiaryId: string
  kind: TokenKind
  issuedAt: number
  expiresAt: number
  used: boolean
}

export type StoreState = {
  pool: number
  programs: Program[]
  beneficiaries: Beneficiary[]
  transactions: Transaction[]
  tokens: TokenRecord[]
}

export type LineInput = {
  productId: string
  name: string
  category: Category
  unitPrice: number
  qty: number
}

export type Shop = {
  id: string
  name: string
  address: string
}

export type Product = {
  id: string
  name: string
  category: Category
  price: number
  unit: string
}
