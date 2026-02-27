import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { api } from '../api/client';

type Me = { id: string; email: string; role: string };

export function AdminUsersPage() {
  const { t } = useTranslation();
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    api.get<Me>('/me').then((response) => setMe(response.data));
  }, []);

  return (
    <main className="card space-y-2">
      <h1 className="text-xl font-semibold">{t('admin_users_title')}</h1>
      <p>{t('admin_users_desc')}</p>
      <p>{t('admin_current_user')} {me?.email ?? 'unknown'} ({me?.role ?? 'unknown'})</p>
    </main>
  );
}
