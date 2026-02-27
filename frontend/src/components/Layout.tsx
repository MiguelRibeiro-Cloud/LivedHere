import { useEffect, useMemo, useState } from 'react';
import { Link, Outlet, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { api } from '../api/client';
import { useMe } from '../hooks/useMe';
import { AIAssistant } from './AIAssistant';
import { LanguageSwitcher } from './LanguageSwitcher';
import { Footer } from './Footer';

export function Layout() {
  const { t, i18n } = useTranslation();
  const { locale = 'en' } = useParams();
  const navigate = useNavigate();
  const { me, loading } = useMe();
  const [mobileOpen, setMobileOpen] = useState(false);

  const base = useMemo(() => `/${locale}`, [locale]);

  if (i18n.language !== locale) {
    void i18n.changeLanguage(locale);
  }

  // Update the document lang attribute for accessibility
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    setMobileOpen(false);
  }, [locale]);

  async function logout() {
    await api.post('/auth/logout');
    navigate(`${base}/auth/login`);
  }

  const navLinkClassName = 'text-sm font-medium text-ink/90 hover:text-ink';

  return (
    <div className="mx-auto min-h-screen max-w-[1100px] px-4 py-6">
      {/* Skip to content — accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-white focus:shadow-lg"
      >
        Skip to content
      </a>

      <header className="mb-6 rounded-xl border border-slate-200 bg-white/80 px-4 py-3 backdrop-blur" role="banner">
        <div className="flex items-center justify-between gap-3">
          <Link to={base} className="text-lg font-bold tracking-tight text-primary" aria-label="LivedHere — home">
            LivedHere
          </Link>

          <nav className="hidden items-center gap-4 md:flex" aria-label="Main navigation">
            <Link className={navLinkClassName} to={`${base}/search`}>
              {t('search')}
            </Link>
            <Link className="btn text-sm" to={`${base}/submit`}>
              {t('submit_review')}
            </Link>

            {!loading && !me && (
              <Link className={navLinkClassName} to={`${base}/auth/login`}>
                {t('login')}
              </Link>
            )}

            {!loading && me && (
              <details className="relative">
                <summary className="cursor-pointer list-none text-sm font-semibold text-ink/90 hover:text-ink">
                  {t('my_reviews')}
                </summary>
                <div className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-md">
                  <Link className="block rounded-lg px-3 py-2 text-sm hover:bg-sand" to={`${base}/status`}>
                    {t('review_status')}
                  </Link>
                  <Link className="block rounded-lg px-3 py-2 text-sm hover:bg-sand" to={`${base}/account`}>
                    {t('account')}
                  </Link>
                  {me.role === 'ADMIN' && (
                    <Link className="block rounded-lg px-3 py-2 text-sm hover:bg-sand" to={`${base}/admin`}>
                      {t('admin')}
                    </Link>
                  )}
                  <button className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-sand" type="button" onClick={logout}>
                    {t('logout')}
                  </button>
                </div>
              </details>
            )}

            <LanguageSwitcher />
          </nav>

          <div className="flex items-center gap-2 md:hidden">
            <LanguageSwitcher />
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-ink"
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav"
              onClick={() => setMobileOpen((prev) => !prev)}
            >
              {mobileOpen ? '✕' : 'Menu'}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <nav id="mobile-nav" className="mt-3 grid gap-2 md:hidden" aria-label="Mobile navigation">
            <Link className="rounded-lg px-3 py-2 text-sm font-medium text-ink/90 hover:bg-sand" to={`${base}/search`} onClick={() => setMobileOpen(false)}>
              {t('search')}
            </Link>
            <Link className="btn w-full text-center text-sm" to={`${base}/submit`} onClick={() => setMobileOpen(false)}>
              {t('submit_review')}
            </Link>

            {!loading && !me && (
              <Link className="rounded-lg px-3 py-2 text-sm font-medium text-ink/90 hover:bg-sand" to={`${base}/auth/login`} onClick={() => setMobileOpen(false)}>
                {t('login')}
              </Link>
            )}

            {!loading && me && (
              <div className="rounded-xl border border-slate-200 bg-white p-2">
                <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-ink/60">{t('my_reviews')}</p>
                <Link className="block rounded-lg px-3 py-2 text-sm hover:bg-sand" to={`${base}/status`} onClick={() => setMobileOpen(false)}>
                  {t('review_status')}
                </Link>
                <Link className="block rounded-lg px-3 py-2 text-sm hover:bg-sand" to={`${base}/account`} onClick={() => setMobileOpen(false)}>
                  {t('account')}
                </Link>
                {me.role === 'ADMIN' && (
                  <Link className="block rounded-lg px-3 py-2 text-sm hover:bg-sand" to={`${base}/admin`} onClick={() => setMobileOpen(false)}>
                    {t('admin')}
                  </Link>
                )}
                <button className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-sand" type="button" onClick={logout}>
                  {t('logout')}
                </button>
              </div>
            )}
          </nav>
        )}
      </header>

      <div id="main-content">
        <Outlet />
      </div>

      <Footer />

      <AIAssistant />
    </div>
  );
}
