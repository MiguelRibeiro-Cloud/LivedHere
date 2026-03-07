import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { api } from '../api/client';
import { useMe } from '../hooks/useMe';

export function AccountPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { locale = 'en' } = useParams();
  const { me } = useMe();
  const [busyAction, setBusyAction] = useState<null | 'logout' | 'delete'>(null);
  const [error, setError] = useState('');

  function renderError(err: unknown): string {
    const detail = (err as any)?.response?.data?.detail;
    if (typeof detail === 'string' && detail.trim()) {
      return detail;
    }
    return t('account_action_error');
  }

  async function logout() {
    setError('');
    setBusyAction('logout');
    try {
      await api.post('/auth/logout');
      navigate(`/${locale}/auth/login`);
    } catch (err) {
      setError(renderError(err));
    } finally {
      setBusyAction(null);
    }
  }

  async function deleteMe() {
    if (!window.confirm(t('account_delete_confirm'))) return;
    setError('');
    setBusyAction('delete');
    try {
      await api.delete('/me');
      await api.post('/auth/logout');
      navigate(`/${locale}/auth/login`);
    } catch (err) {
      setError(renderError(err));
    } finally {
      setBusyAction(null);
    }
  }

  if (!me) return <main className="card">{t('account_please_login')}</main>;

  return (
    <main className="card space-y-3">
      <h1 className="text-xl font-bold text-ink">{t('account_title')}</h1>
      <p>{t('account_email')} {me.email}</p>
      <p>{t('account_role')} {me.role}</p>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <div className="flex gap-2">
        <button className="btn" onClick={logout} disabled={busyAction !== null}>
          {busyAction === 'logout' ? t('account_logging_out') : t('account_logout')}
        </button>
        {me.role !== 'ADMIN' && (
          <button className="btn-accent" onClick={deleteMe} disabled={busyAction !== null}>
            {busyAction === 'delete' ? t('account_deleting') : t('account_delete')}
          </button>
        )}
      </div>
    </main>
  );
}
