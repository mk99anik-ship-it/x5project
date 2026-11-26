import { useRef } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useApp } from '../state/store';

const ROLES = [
  { to: '/magazin', short: 'Магазин', full: 'Сотрудник магазина' },
  { to: '/volonter', short: 'Волонтёр', full: 'Волонтёр / фонд' },
  { to: '/nuzhdy', short: 'Нужды', full: 'Соцработник / пункт' },
  { to: '/dashboard', short: 'Фонд', full: 'Дашборд фонда' },
];

export function Layout() {
  const { toast, dismissToast, reset } = useApp();
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <div className="app-shell">
      <a className="skip" href="#content">
        К содержанию
      </a>
      <header className="site-header">
        <div className="header-inner">
          <NavLink to="/" className="brand" end>
            <span className="logo-mark" aria-hidden="true">
              <svg viewBox="0 0 32 32">
                <path d="M5 23.5h22M7 18.5h18M6 13.5h20" />
                <circle cx="23" cy="8" r="2.1" />
              </svg>
            </span>
            <span>
              <span className="brand-name">Вечерняя полка</span>
              <span className="brand-sub">фонд «Выручаем»</span>
            </span>
          </NavLink>
          <nav className="role-nav" aria-label="Роль">
            {ROLES.map((role) => (
              <NavLink key={role.to} to={role.to} className={({ isActive }) => (isActive ? 'role-link is-active' : 'role-link')}>
                <span className="role-short">{role.short}</span>
                <span className="role-full">{role.full}</span>
              </NavLink>
            ))}
          </nav>
          <button type="button" className="btn btn-ghost btn-small no-print" onClick={() => dialogRef.current?.showModal()}>
            Сбросить демо
          </button>
        </div>
      </header>
      {toast ? (
        <div className="toast-wrap">
          <div className="toast" role="status" aria-live="polite">
            <span>{toast}</span>
            <button type="button" className="toast-close" onClick={dismissToast} aria-label="Закрыть уведомление">
              ×
            </button>
          </div>
        </div>
      ) : null}
      <main id="content" className="site-main">
        <Outlet />
      </main>
      <footer className="site-footer">
        <p>Демо для конкурса «Вайбкодинг добрых дел». Персональные данные не собираются и не хранятся.</p>
        <p>X5 Клуб и благотворительный фонд X5 «Выручаем». Срок подачи — 7 декабря 2026.</p>
      </footer>
      <dialog
        ref={dialogRef}
        className="modal"
        aria-labelledby="reset-title"
        onClick={(event) => {
          if (event.target === dialogRef.current) dialogRef.current?.close();
        }}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            dialogRef.current?.close();
            reset();
          }}
        >
          <h2 id="reset-title">Сбросить демо?</h2>
          <p>Текущие брони, нужды и товары на полке заменятся исходным набором. Всё хранится только в этом браузере.</p>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={() => dialogRef.current?.close()}>
              Отмена
            </button>
            <button type="submit" className="btn">
              Сбросить
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
