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
    title: 'Как это проходит',
    body: 'Фонд выпускает карту. Человек открывает её в телефоне. Касса списывает продукты. Отчёт обновляется.',
  },
  {
    id: 'fund',
    view: 'fund',
    title: 'Фонд задаёт правила',
    body: 'Три программы: семьи с детьми, пожилые и диабет. У каждой свой лимит и свой список продуктов.',
  },
  {
    id: 'issue',
    view: 'fund',
    title: 'Фонд выпускает карту',
    body: 'Новая карта в программе «Семьи с детьми». Номер вида ПК-1026. Имени нет.',
    action: 'issue',
  },
  {
    id: 'wallet',
    view: 'wallet',
    title: 'Карта в телефоне',
    body: 'На экране обычная карта покупателя. Номер постоянный, касса принимает его.',
  },
  {
    id: 'planner',
    view: 'wallet',
    title: 'Список покупок',
    body: 'В списке есть пиво. Баллами его не оплатить, это видно до кассы.',
    action: 'planner',
  },
  {
    id: 'pos',
    view: 'pos',
    title: 'Обычная касса',
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
    title: 'Отчёт',
    body: 'Фонд видит суммы, семьи и странные покупки. Рядом страница для волонтёров.',
  },
]
