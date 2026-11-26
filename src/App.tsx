import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ActPage } from './pages/ActPage';
import { Landing } from './pages/Landing';
import { NeedsPage } from './pages/NeedsPage';
import { StorePage } from './pages/StorePage';
import { VolunteerPage } from './pages/VolunteerPage';
import { StateProvider } from './state/store';

const DashboardPage = lazy(() => import('./pages/DashboardPage').then((module) => ({ default: module.DashboardPage })));

function basename(): string | undefined {
  const raw = import.meta.env.BASE_URL;
  if (!raw || raw === '/') return undefined;
  return raw.replace(/\/$/, '');
}

export function App() {
  return (
    <StateProvider>
      <BrowserRouter basename={basename()}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Landing />} />
            <Route path="/magazin" element={<StorePage />} />
            <Route path="/volonter" element={<VolunteerPage />} />
            <Route path="/nuzhdy" element={<NeedsPage />} />
            <Route
              path="/dashboard"
              element={
                <Suspense fallback={<p className="empty boot">Загрузка дашборда…</p>}>
                  <DashboardPage />
                </Suspense>
              }
            />
            <Route path="/akt/:id" element={<ActPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </StateProvider>
  );
}
