import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getOptionalUser } from '@/lib/security/auth';
import { prisma } from '@/lib/prisma';

export default async function AccountPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await getOptionalUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const reviews = await prisma.review.findMany({
    where: { authorUserId: user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      building: {
        include: {
          street: true
        }
      }
    }
  });

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-white p-6 shadow">
        <h1 className="text-2xl font-semibold">My account</h1>
        <p>{user.email}</p>
      </div>

      <div className="rounded-xl bg-white p-6 shadow">
        <h2 className="mb-3 text-xl font-semibold">My submissions</h2>
        <div className="space-y-2">
          {reviews.map((review) => (
            <div key={review.id} className="rounded border border-slate-200 p-3">
              <p>
                {review.building.street.name} {review.building.streetNumber}
              </p>
              <p className="text-sm">Status: {review.status}</p>
              {review.status === 'CHANGES_REQUESTED' ? (
                <div className="text-sm">
                  <p>Message: {review.moderationMessage}</p>
                  <Link href={`/${locale}/submit?trackingCode=${review.trackingCode}`}>Edit and resubmit</Link>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
