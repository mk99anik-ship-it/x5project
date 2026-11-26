import { Link, useParams } from 'react-router-dom';
import { formatKg, formatRub } from '../lib/format';
import { formatMoscow } from '../lib/time';
import { useApp } from '../state/store';

export function ActPage() {
  const { id } = useParams();
  const { state } = useApp();
  const act = state.acts.find((item) => item.id === id);

  if (!act) {
    return (
      <div className="stack">
        <h1>Акт не найден</h1>
        <p>Документ хранится только в этом браузере. Если демо сбрасывали, старый акт уже не открыть.</p>
        <Link className="btn" to="/magazin">
          Вернуться на полку
        </Link>
      </div>
    );
  }

  return (
    <article className="act">
      <div className="no-print action-row">
        <button type="button" className="btn" onClick={() => window.print()}>
          Печать
        </button>
        <Link className="btn btn-ghost" to="/magazin">
          На полку
        </Link>
      </div>
      <p className="eyebrow">Благотворительный фонд X5 «Выручаем»</p>
      <h1>Акт передачи продуктов</h1>
      <p className="act-number">{act.number}</p>
      <dl className="act-meta">
        <div>
          <dt>Дата</dt>
          <dd>{formatMoscow(act.createdAt)}</dd>
        </div>
        <div>
          <dt>Магазин</dt>
          <dd>
            {act.storeName}, {act.storeAddress}
          </dd>
        </div>
        <div>
          <dt>Получатель</dt>
          <dd>{act.volunteerLabel}</dd>
        </div>
        {act.pointLabel ? (
          <div>
            <dt>Пункт</dt>
            <dd>{act.pointLabel}</dd>
          </div>
        ) : null}
      </dl>
      <table className="data-table">
        <caption>Состав передачи</caption>
        <thead>
          <tr>
            <th>Наименование</th>
            <th>Категория</th>
            <th>Условия</th>
            <th>Кол-во</th>
            <th>Вес</th>
            <th>Годен до</th>
          </tr>
        </thead>
        <tbody>
          {act.lines.map((line, index) => (
            <tr key={`${line.name}-${index}`}>
              <td>{line.name}</td>
              <td>{line.category}</td>
              <td>{line.storage}</td>
              <td>
                {line.quantity} {line.unit}
              </td>
              <td>{formatKg(line.weightKg)}</td>
              <td>{formatMoscow(line.expiresAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        Итого {formatKg(act.totalKg)}, оценочная стоимость {formatRub(act.totalRub)}. Продукты пригодны к передаче на момент
        составления акта и направляются на благотворительную помощь вместо списания.
      </p>
      <div className="signs">
        <p>
          Сотрудник магазина
          <span />
        </p>
        <p>
          {act.volunteerLabel}
          <span />
        </p>
      </div>
      <p className="fine">Демонстрационный документ. Персональные данные подопечных в акт не включаются.</p>
    </article>
  );
}
