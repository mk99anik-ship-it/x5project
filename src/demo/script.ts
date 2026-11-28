export type ViewId = 'landing' | 'fund' | 'wallet' | 'pos' | 'reports' | 'volunteers'

export type DemoAction = 'issue' | 'planner' | 'basket' | 'pay'

export type DemoStep = {
  id: string
  view: ViewId
  title: string
  body: string
  action?: DemoAction
}

export const DEMO_STEPS: DemoStep[] = [
  {
    id: 'intro',
    view: 'landing',
    title: 'Как проходит покупка',
    body: 'Пройдите весь путь: от выпуска карты до покупки на кассе и отчёта фонда.',
  },
  {
    id: 'fund',
    view: 'fund',
    title: 'Фонд задаёт правила',
    body: 'Есть три программы: семьи с детьми, пожилые и диабет. У каждой свой лимит и свой список продуктов.',
  },
  {
    id: 'issue',
    view: 'fund',
    title: 'Фонд выпускает карту',
    body: 'Фонд выпускает карту по программе «Семьи с детьми». На ней только номер, например ПК-1026, без имени.',
    action: 'issue',
  },
  {
    id: 'wallet',
    view: 'wallet',
    title: 'Карта в телефоне',
    body: 'На экране обычная карта покупателя с постоянным номером. Касса принимает этот номер.',
  },
  {
    id: 'planner',
    view: 'wallet',
    title: 'Список покупок',
    body: 'В списке покупок есть пиво. Человек заранее видит, что за него придётся заплатить самому.',
    action: 'planner',
  },
  {
    id: 'pos',
    view: 'pos',
    title: 'Кассир пробивает покупку',
    body: 'Кассир пробивает молоко, гречку, яблоки, пюре, шоколад и пиво.',
    action: 'basket',
  },
  {
    id: 'pay',
    view: 'pos',
    title: 'Оплата баллами',
    body: 'На чеке только баллы и доплата. Пиво ушло в обычную оплату.',
    action: 'pay',
  },
  {
    id: 'report',
    view: 'reports',
    title: 'Что видно в отчёте',
    body: 'Фонд видит суммы, семьи и покупки, которые стоит проверить. Рядом есть страница для волонтёров.',
  },
]
