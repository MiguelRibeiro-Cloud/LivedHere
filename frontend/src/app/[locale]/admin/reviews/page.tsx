import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/security/auth';
import { prisma } from '@/lib/prisma';

const tabs = ['PENDING', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED', 'REMOVED', 'REPORTED'];

export default async function AdminReviewsPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const raw = await searchParams;

  try {
    await requireAdmin();
  } catch {
    redirect(`/${locale}/auth/login`);
  }

  const tab = typeof raw.tab === 'string' && tabs.includes(raw.tab) ? raw.tab : 'PENDING';

  const reviews =
    tab === 'REPORTED'
      ? await prisma.review.findMany({
          where: {
            reports: {
              some: {
                resolvedAt: null
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 100,
          include: {
            building: {
              include: {
                street: true
              }
            }
          }
        })
      : await prisma.review.findMany({
          where: { status: tab as 'PENDING' | 'CHANGES_REQUESTED' | 'APPROVED' | 'REJECTED' | 'REMOVED' },
          orderBy: { createdAt: 'desc' },
          take: 100,
          include: {
            building: {
              include: {
                street: true
              }
            }
          }
        });

  const reportsCount = await prisma.report.count({
    where: { resolvedAt: null }
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Moderation queue</h1>
      <div className="flex flex-wrap gap-2">
        {tabs.map((item) => (
          <Link key={item} href={`/${locale}/admin/reviews?tab=${item}`} className={`rounded border px-3 py-1 ${tab === item ? 'border-primary text-primary' : 'border-slate-300'}`}>
            {item}
          </Link>
        ))}
        <span className="rounded border border-accent px-3 py-1 text-accent">Reported: {reportsCount}</span>
      </div>

      <div className="space-y-2">
        {reviews.map((review) => (
          <Link key={review.id} href={`/${locale}/admin/reviews/${review.id}`} className="block rounded-xl bg-white p-4 shadow">
            <p className="font-medium">
              {review.building.street.name} {review.building.streetNumber}
            </p>
            <p className="text-sm">Status: {review.status} · PII flagged: {review.piiFlagged ? 'yes' : 'no'}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
