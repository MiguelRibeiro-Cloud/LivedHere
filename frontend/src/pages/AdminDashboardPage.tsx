import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function AdminDashboardPage() {
  const { t } = useTranslation();
  const { locale = 'en' } = useParams();

  return (
    <main className="grid gap-3 md:grid-cols-2">
      <Link className="card font-semibold text-primary" to={`/${locale}/admin/reviews`}>{t('admin_moderate_reviews')}</Link>
      <Link className="card font-semibold text-primary" to={`/${locale}/admin/reports`}>{t('admin_resolve_reports')}</Link>
      <Link className="card font-semibold text-primary" to={`/${locale}/admin/places`}>{t('admin_manage_places')}</Link>
      <Link className="card font-semibold text-primary" to={`/${locale}/admin/users`}>{t('admin_manage_users')}</Link>
    </main>
  );
}
