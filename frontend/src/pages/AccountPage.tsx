import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { api } from '../api/client';
import { useMe } from '../hooks/useMe';

export function AccountPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { locale = 'en' } = useParams();
  const { me } = useMe();

  async function logout() {
    await api.post('/auth/logout');
    navigate(`/${locale}/auth/login`);
  }

  async function deleteMe() {
    if (!window.confirm(t('account_delete_confirm'))) return;
    await api.delete('/me');
    await logout();
  }

  if (!me) return <main className="card">{t('account_please_login')}</main>;

  return (
    <main className="card space-y-3">
      <h1 className="text-xl font-bold text-ink">{t('account_title')}</h1>
      <p>{t('account_email')} {me.email}</p>
      <p>{t('account_role')} {me.role}</p>
      <div className="flex gap-2">
        <button className="btn" onClick={logout}>{t('account_logout')}</button>
        <button className="btn-accent" onClick={deleteMe}>{t('account_delete')}</button>
      </div>
    </main>
  );
}
