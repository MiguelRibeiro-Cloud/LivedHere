import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/security/auth';

export default async function AdminPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  try {
    await requireAdmin();
  } catch {
    redirect(`/${locale}/auth/login`);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Admin</h1>
      <div className="grid gap-3 md:grid-cols-3">
        <Link className="rounded-xl bg-white p-4 shadow" href={`/${locale}/admin/reviews`}>
          Moderation queue
        </Link>
        <Link className="rounded-xl bg-white p-4 shadow" href={`/${locale}/admin/places`}>
          Places
        </Link>
        <Link className="rounded-xl bg-white p-4 shadow" href={`/${locale}/admin/users`}>
          Users
        </Link>
      </div>
    </div>
  );
}
