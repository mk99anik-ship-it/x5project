export function Landing({ onDemo, onVolunteers }: { onDemo: () => void; onVolunteers: () => void }) {
  return (
    <div className="page">
      <section className="hero">
        <div>
          <p className="kicker">Фонд «Выручаем»</p>
          <h1>Продуктовая карта в обычном магазине</h1>
          <p className="lead">
            Фонд «Выручаем» выдаёт карту. Человек сам выбирает еду и платит на кассе баллами.
          </p>
          <div className="hero-actions">
            <button type="button" className="btn btn-primary" onClick={onDemo}>
              Показать, как это работает
            </button>
          </div>
        </div>
        <article className="sample-receipt" aria-label="Пример чека">
          <p className="kicker">Чек на кассе</p>
          <h2>Пятёрочка, ул. Лесная</h2>
          <ul>
            <li>
              <span>Молоко 3,2%</span>
              <b>баллами</b>
            </li>
            <li>
              <span>Гречка</span>
              <b>баллами</b>
            </li>
            <li>
              <span>Яблоки</span>
              <b>баллами</b>
            </li>
            <li>
              <span>Пюре детское</span>
              <b>баллами</b>
            </li>
            <li>
              <span>Пиво светлое</span>
              <b>89 ₽</b>
            </li>
          </ul>
          <dl>
            <div>
              <dt>Оплачено баллами карты</dt>
              <dd>376 ₽</dd>
            </div>
            <div>
              <dt>К оплате</dt>
              <dd>89 ₽</dd>
            </div>
          </dl>
        </article>
      </section>

      <section id="steps" className="steps">
        <h2>Как это работает</h2>
        <ol>
          <li>
            <span>1</span>
            <div>
              <h3>Фонд выпускает карту</h3>
              <p>Лимит на месяц и список продуктов. Алкоголь и табак закрыты.</p>
            </div>
          </li>
          <li>
            <span>2</span>
            <div>
              <h3>Человек выбирает еду сам</h3>
              <p>Любой магазин сети. В телефоне это обычная карта покупателя.</p>
            </div>
          </li>
          <li>
            <span>3</span>
            <div>
              <h3>Касса делит чек</h3>
              <p>Нужные продукты списываются баллами. Остальное человек оплачивает сам.</p>
            </div>
          </li>
        </ol>
      </section>

      <section className="impl">
        <h2>Кому это нужно</h2>
        <ul className="plain-list lines">
          <li>Фонду не нужен склад и раздача. В отчёте видно, на что ушли деньги.</li>
          <li>Семья берёт детское питание или еду при диабете. Отдельной выдачи нет.</li>
          <li>Магазин использует ту же кассу. Отдельной выдачи нет.</li>
        </ul>
        <h2>Как подключить в X5</h2>
        <ol className="phases">
          <li>
            <h3>Один город</h3>
            <p>Около 200 карт, магазины «Пятёрочка». Касса списывает баллы как сейчас.</p>
          </li>
          <li>
            <h3>Две суммы на кассе</h3>
            <p>Касса читает номер карты. В чеке две суммы: баллы и доплата.</p>
          </li>
          <li>
            <h3>Вся сеть</h3>
            <p>«Перекрёсток» и «Чижик». Волонтёры видят, сколько семей получили продукты и где ещё есть свободные карты.</p>
          </li>
        </ol>
        <p>Имени и телефона в программе нет. На карте только номер. Кассир видит баллы и сумму к доплате.</p>
        <button type="button" className="btn btn-primary" onClick={onVolunteers}>
          Страница для волонтёров
        </button>
      </section>

      <footer className="footer">
        <p>Тихая касса. Прототип для фонда X5 «Выручаем».</p>
      </footer>
    </div>
  )
}
