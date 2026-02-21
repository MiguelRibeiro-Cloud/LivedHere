import { Link, Outlet, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function Layout() {
  const { t, i18n } = useTranslation();
  const { locale = 'en' } = useParams();

  if (i18n.language !== locale) {
    void i18n.changeLanguage(locale);
  }

  return (
    <div className="mx-auto min-h-screen max-w-6xl px-4 py-6">
      <header className="card mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link to={`/${locale}`} className="text-2xl font-bold text-primary">
          LivedHere
        </Link>
        <nav className="flex gap-3 text-sm font-medium">
          <Link to={`/${locale}`}>{t('home')}</Link>
          <Link to={`/${locale}/search`}>{t('search')}</Link>
          <Link to={`/${locale}/map`}>{t('map')}</Link>
          <Link to={`/${locale}/submit`}>{t('submit')}</Link>
          <Link to={`/${locale}/auth/login`}>{t('login')}</Link>
          <Link to={`/${locale}/account`}>{t('account')}</Link>
          <Link to={`/${locale}/admin`}>{t('admin')}</Link>
        </nav>
      </header>
      <Outlet />
    </div>
  );
}
