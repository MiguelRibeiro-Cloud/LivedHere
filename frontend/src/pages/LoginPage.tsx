import { FormEvent, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { api } from '../api/client';

export function LoginPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [searchParams] = useSearchParams();
  const [message, setMessage] = useState('');

  async function requestLink(event: FormEvent) {
    event.preventDefault();
    const response = await api.post('/auth/request-link', { email });
    setMessage(response.data.dev_link ? `Dev link: ${response.data.dev_link}` : 'Check your email.');
  }

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) return;
    api.get('/auth/callback', { params: { token } }).then(() => setMessage('Authenticated successfully.'));
  }, [searchParams]);

  return (
    <main className="card space-y-3">
      <form onSubmit={requestLink} className="space-y-2">
        <input className="input" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={t('email')} />
        <button className="btn" type="submit">{t('request_magic')}</button>
      </form>
      {message && <p className="text-sm">{message}</p>}
    </main>
  );
}
