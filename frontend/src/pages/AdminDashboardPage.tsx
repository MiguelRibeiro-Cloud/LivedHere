import { Link, useParams } from 'react-router-dom';

export function AdminDashboardPage() {
  const { locale = 'en' } = useParams();

  return (
    <main className="grid gap-3 md:grid-cols-2">
      <Link className="card font-semibold text-primary" to={`/${locale}/admin/reviews`}>Moderate Reviews</Link>
      <Link className="card font-semibold text-primary" to={`/${locale}/admin/reports`}>Resolve Reports</Link>
      <Link className="card font-semibold text-primary" to={`/${locale}/admin/places`}>Manage Places</Link>
      <Link className="card font-semibold text-primary" to={`/${locale}/admin/users`}>Manage Users</Link>
    </main>
  );
}
