import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';

export default async function ReviewStatusPage({
  params
}: {
  params: Promise<{ trackingCode: string }>;
}) {
  const { trackingCode } = await params;

  const review = await prisma.review.findUnique({
    where: { trackingCode },
    select: {
      status: true,
      trackingCode: true,
      moderationMessage: true,
      updatedAt: true
    }
  });

  if (!review) notFound();

  return (
    <div className="max-w-xl rounded-xl bg-white p-6 shadow">
      <h1 className="mb-3 text-2xl font-semibold">Review status</h1>
      <p>Tracking code: {review.trackingCode}</p>
      <p>Status: {review.status}</p>
      {review.moderationMessage ? <p>Message: {review.moderationMessage}</p> : null}
      <p className="text-sm text-slate-600">Updated: {review.updatedAt.toISOString()}</p>
    </div>
  );
}
