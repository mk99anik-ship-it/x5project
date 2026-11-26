import type { ReactNode } from 'react';
import type { ItemStatus, Priority } from '../types';

export function StatusPill({ status }: { status: ItemStatus }) {
  return <span className={`pill pill-${status}`}>{status}</span>;
}

export function PriorityPill({ priority }: { priority: Priority }) {
  return <span className={`pill pill-${priority}`}>{priority}</span>;
}

export function PageIntro({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return (
    <header className="page-intro">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p>{text}</p>
    </header>
  );
}

export function EmptyNote({ children }: { children: ReactNode }) {
  return <p className="empty">{children}</p>;
}
