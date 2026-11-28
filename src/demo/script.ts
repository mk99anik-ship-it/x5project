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
    body: 'Фонд выпускает карту, человек открывает её в телефоне, касса списывает продукты, и отчёт обновляется.',
  },
  {
    id: 'fund',
    view: 'fund',
    title: 'Фонд задаёт правила',
    body: 'Есть три программы: семьи с детьми, пожилые и диабет, и у каждой свой лимит и свой список продуктов.',
  },
  {
    id: 'issue',
    view: 'fund',
    title: 'Фонд выпускает карту',
    body: 'Новая карта в программе «Семьи с детьми», номер вида ПК-1026, и имени на ней нет.',
    action: 'issue',
  },
  {
    id: 'wallet',
    view: 'wallet',
    title: 'Карта в телефоне',
    body: 'На экране обычная карта покупателя с постоянным номером, и касса принимает его.',
  },
  {
    id: 'planner',
    view: 'wallet',
    title: 'Список покупок',
    body: 'В списке есть пиво, и баллами его не оплатить, это видно ещё до кассы.',
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
    body: 'На чеке только баллы и доплата, а пиво ушло в обычную оплату.',
    action: 'pay',
  },
  {
    id: 'report',
    view: 'reports',
    title: 'Что видно в отчёте',
    body: 'Фонд видит суммы, семьи и покупки, которые стоит проверить, а рядом есть страница для волонтёров.',
  },
]
