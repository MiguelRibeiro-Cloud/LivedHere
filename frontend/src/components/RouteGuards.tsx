import { Navigate, Outlet, useParams } from 'react-router-dom';

import { useMe } from '../hooks/useMe';

export function RequireAuth() {
  const { locale = 'en' } = useParams();
  const { me, loading } = useMe();

  if (loading) {
    return <main className="card">Checking session…</main>;
  }

  if (!me) {
    return <Navigate to={`/${locale}/auth/login`} replace />;
  }

  return <Outlet />;
}

export function RequireAdmin() {
  const { locale = 'en' } = useParams();
  const { me, loading } = useMe();

  if (loading) {
    return <main className="card">Checking admin access…</main>;
  }

  if (!me) {
    return <Navigate to={`/${locale}/auth/login`} replace />;
  }

  if (me.role !== 'ADMIN') {
    return <Navigate to={`/${locale}/account`} replace />;
  }

  return <Outlet />;
}
