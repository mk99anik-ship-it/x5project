import type { LineInput, Product, Shop } from '../types'

export const SHOPS: Shop[] = [
  { id: 's1', name: 'Пятёрочка', address: 'ул. Лесная, 12' },
  { id: 's2', name: 'Пятёрочка', address: 'пр. Мира, 44' },
  { id: 's3', name: 'Перекрёсток', address: 'ул. Садовая, 7' },
  { id: 's4', name: 'Перекрёсток', address: 'ТЦ «Северный»' },
  { id: 's5', name: 'Чижик', address: 'ул. Полевая, 3' },
  { id: 's6', name: 'Пятёрочка', address: 'ул. Дачная, 18' },
]

export function shopLabel(shop: Shop): string {
  return `${shop.name}, ${shop.address}`
}

export const PRODUCTS: Product[] = [
  { id: 'milk', name: 'Молоко 3,2%', category: 'dairy', price: 89, unit: '930 мл' },
  { id: 'kefir', name: 'Кефир 2,5%', category: 'dairy', price: 79, unit: '900 мл' },
  { id: 'tvorog', name: 'Творог 5%', category: 'dairy', price: 92, unit: '200 г' },
  { id: 'smetana', name: 'Сметана 20%', category: 'dairy', price: 115, unit: '300 г' },
  { id: 'cheese', name: 'Сыр Российский', category: 'dairy', price: 189, unit: '200 г' },
  { id: 'yogurt', name: 'Йогурт натуральный', category: 'dairy', price: 45, unit: '150 г' },
  { id: 'butter', name: 'Масло сливочное', category: 'dairy', price: 169, unit: '180 г' },
  { id: 'ryazhenka', name: 'Ряженка 4%', category: 'dairy', price: 64, unit: '500 мл' },
  { id: 'potato', name: 'Картофель', category: 'vegetables', price: 46, unit: '1 кг' },
  { id: 'carrot', name: 'Морковь', category: 'vegetables', price: 49, unit: '1 кг' },
  { id: 'onion', name: 'Лук репчатый', category: 'vegetables', price: 42, unit: '1 кг' },
  { id: 'cabbage', name: 'Капуста белокочанная', category: 'vegetables', price: 39, unit: '1 кг' },
  { id: 'tomato', name: 'Помидоры', category: 'vegetables', price: 189, unit: '1 кг' },
  { id: 'cucumber', name: 'Огурцы', category: 'vegetables', price: 159, unit: '1 кг' },
  { id: 'beet', name: 'Свёкла', category: 'vegetables', price: 44, unit: '1 кг' },
  { id: 'zucchini', name: 'Кабачки', category: 'vegetables', price: 99, unit: '1 кг' },
  { id: 'apple', name: 'Яблоки', category: 'fruits', price: 129, unit: '1 кг' },
  { id: 'banana', name: 'Бананы', category: 'fruits', price: 119, unit: '1 кг' },
  { id: 'orange', name: 'Апельсины', category: 'fruits', price: 149, unit: '1 кг' },
  { id: 'pear', name: 'Груши', category: 'fruits', price: 169, unit: '1 кг' },
  { id: 'chicken', name: 'Курица, тушка', category: 'meat', price: 249, unit: '1 кг' },
  { id: 'beef', name: 'Фарш говяжий', category: 'meat', price: 289, unit: '400 г' },
  { id: 'pork', name: 'Свинина, лопатка', category: 'meat', price: 349, unit: '1 кг' },
  { id: 'turkey', name: 'Филе индейки', category: 'meat', price: 279, unit: '500 г' },
  { id: 'pollock', name: 'Минтай, филе', category: 'fish', price: 219, unit: '500 г' },
  { id: 'herring', name: 'Сельдь слабосолёная', category: 'fish', price: 159, unit: '300 г' },
  { id: 'salmon', name: 'Горбуша, консервы', category: 'fish', price: 189, unit: '245 г' },
  { id: 'bread', name: 'Хлеб бородинский', category: 'bakery', price: 52, unit: '400 г' },
  { id: 'loaf', name: 'Батон нарезной', category: 'bakery', price: 46, unit: '400 г' },
  { id: 'grainbread', name: 'Хлеб цельнозерновой', category: 'bakery', price: 64, unit: '300 г' },
  { id: 'buckwheat', name: 'Гречка', category: 'grocery', price: 109, unit: '900 г' },
  { id: 'rice', name: 'Рис круглозёрный', category: 'grocery', price: 99, unit: '800 г' },
  { id: 'pasta', name: 'Макароны', category: 'grocery', price: 69, unit: '450 г' },
  { id: 'oil', name: 'Масло подсолнечное', category: 'grocery', price: 139, unit: '1 л' },
  { id: 'salt', name: 'Соль поваренная', category: 'grocery', price: 28, unit: '1 кг' },
  { id: 'flour', name: 'Мука пшеничная', category: 'grocery', price: 89, unit: '2 кг' },
  { id: 'eggs', name: 'Яйцо куриное С1', category: 'grocery', price: 119, unit: '10 шт' },
  { id: 'oats', name: 'Овсяные хлопья', category: 'grocery', price: 72, unit: '400 г' },
  { id: 'puree', name: 'Пюре яблочное детское', category: 'baby', price: 49, unit: '100 г' },
  { id: 'vpuree', name: 'Пюре овощное детское', category: 'baby', price: 55, unit: '100 г' },
  { id: 'porridge', name: 'Каша молочная детская', category: 'baby', price: 139, unit: '200 г' },
  { id: 'formula', name: 'Смесь детская', category: 'baby', price: 429, unit: '300 г' },
  { id: 'babybiscuit', name: 'Печенье детское', category: 'baby', price: 89, unit: '120 г' },
  { id: 'water', name: 'Вода питьевая', category: 'drinks', price: 42, unit: '1,5 л' },
  { id: 'tea', name: 'Чай чёрный', category: 'drinks', price: 189, unit: '100 пак.' },
  { id: 'juice', name: 'Сок яблочный', category: 'drinks', price: 119, unit: '1 л' },
  { id: 'compote', name: 'Компот', category: 'drinks', price: 89, unit: '1 л' },
  { id: 'cookie', name: 'Печенье овсяное', category: 'sweets', price: 89, unit: '300 г' },
  { id: 'chocolate', name: 'Шоколад молочный', category: 'sweets', price: 99, unit: '80 г' },
  { id: 'candy', name: 'Конфеты «Ромашки»', category: 'sweets', price: 149, unit: '250 г' },
  { id: 'gingerbread', name: 'Пряники', category: 'sweets', price: 79, unit: '400 г' },
  { id: 'cola', name: 'Кола', category: 'sweets', price: 99, unit: '1 л' },
  { id: 'sugar', name: 'Сахар', category: 'sweets', price: 79, unit: '1 кг' },
  { id: 'soap', name: 'Мыло хозяйственное', category: 'household', price: 45, unit: '200 г' },
  { id: 'powder', name: 'Стиральный порошок', category: 'household', price: 129, unit: '400 г' },
  { id: 'paper', name: 'Бумага туалетная', category: 'household', price: 99, unit: '4 рул.' },
  { id: 'beer', name: 'Пиво светлое', category: 'alcohol', price: 89, unit: '0,45 л' },
  { id: 'wine', name: 'Вино красное сухое', category: 'alcohol', price: 499, unit: '0,75 л' },
  { id: 'vodka', name: 'Водка', category: 'alcohol', price: 449, unit: '0,5 л' },
  { id: 'cigs', name: 'Сигареты', category: 'tobacco', price: 210, unit: 'пачка' },
]

export function productById(id: string): Product | undefined {
  return PRODUCTS.find((item) => item.id === id)
}

export function lineFromProduct(product: Product, qty = 1): LineInput {
  return {
    productId: product.id,
    name: product.name,
    category: product.category,
    unitPrice: product.price,
    qty,
  }
}
