import { Navigate, Outlet, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { useMe } from '../hooks/useMe';

export function RequireAuth() {
  const { t } = useTranslation();
  const { locale = 'en' } = useParams();
  const { me, loading } = useMe();

  if (loading) {
    return <main className="card" aria-busy="true">{t('guard_check_session')}</main>;
  }

  if (!me) {
    return <Navigate to={`/${locale}/auth/login`} replace />;
  }

  return <Outlet />;
}

export function RequireAdmin() {
  const { t } = useTranslation();
  const { locale = 'en' } = useParams();
  const { me, loading } = useMe();

  if (loading) {
    return <main className="card" aria-busy="true">{t('guard_check_admin')}</main>;
  }

  if (!me) {
    return <Navigate to={`/${locale}/auth/login`} replace />;
  }

  if (me.role !== 'ADMIN') {
    return <Navigate to={`/${locale}/account`} replace />;
  }

  return <Outlet />;
}
