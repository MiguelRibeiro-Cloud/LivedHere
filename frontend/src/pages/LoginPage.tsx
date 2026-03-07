import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { api } from '../api/client';
import type { Me } from '../hooks/useMe';

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { locale = 'en' } = useParams();
  const [email, setEmail] = useState('');
  const [searchParams] = useSearchParams();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  function destinationForRole(role: Me['role']) {
    return role === 'ADMIN' ? `/${locale}/admin/reviews` : `/${locale}/account`;
  }

  function extractErrorMessage(err: unknown): string {
    const status = (err as any)?.response?.status;
    const detail = (err as any)?.response?.data?.detail;
    if (typeof detail === 'string' && status) {
      return `${t('error_generic')} (${status}: ${detail})`;
    }
    if (status) {
      return `${t('error_generic')} (${status})`;
    }
    return t('error_generic');
  }

  async function requestLink(event: FormEvent) {
    event.preventDefault();
    setSending(true);
    setError('');
    setMessage('');
    try {
      const response = await api.post('/auth/request-link', { email: email.trim().toLowerCase() });
      setMessage(response.data.dev_link ? `Dev link: ${response.data.dev_link}` : t('login_check_email'));
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      api
        .get<Me>('/me')
        .then((response) => navigate(destinationForRole(response.data.role), { replace: true }))
        .catch(() => undefined);
      return;
    }

    setVerifying(true);
    setError('');
    setMessage(t('login_verifying'));

    api
      .get('/auth/callback', { params: { token } })
      .then(() => api.get<Me>('/me'))
      .then((response) => {
        setMessage(t('login_authenticated'));
        navigate(destinationForRole(response.data.role), { replace: true });
      })
      .catch((err) => {
        setMessage('');
        setError(extractErrorMessage(err));
      })
      .finally(() => setVerifying(false));
  }, [searchParams, navigate, locale, t]);

  return (
    <main className="card space-y-3" aria-busy={sending || verifying}>
      <section className="space-y-1">
        <h1 className="text-xl font-bold text-ink">{t('login_title')}</h1>
        <p className="text-sm text-ink/70">{t('login_subtitle')}</p>
        <p className="text-xs text-ink/60">{t('login_single_flow_note')}</p>
        <p className="text-xs text-ink/60">{t('login_same_browser_note')}</p>
      </section>

      <form onSubmit={requestLink} className="space-y-2">
        <input
          className="input"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={t('login_email_placeholder')}
          autoComplete="email"
          type="email"
          required
          autoFocus
          disabled={sending || verifying}
        />
        <button className="btn" type="submit" disabled={sending || verifying}>
          {sending ? t('login_requesting') : t('request_magic')}
        </button>
      </form>

      {message && <p className="text-sm text-ink/80">{message}</p>}
      {error && <p className="text-sm text-red-700">{error}</p>}
    </main>
  );
}
