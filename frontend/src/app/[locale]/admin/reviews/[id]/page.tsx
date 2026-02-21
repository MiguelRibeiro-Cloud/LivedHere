import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/security/auth';
import { prisma } from '@/lib/prisma';

export default async function AdminReviewDetailPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  try {
    await requireAdmin();
  } catch {
    redirect(`/${locale}/auth/login`);
  }

  const review = await prisma.review.findUnique({
    where: { id },
    include: {
      building: {
        include: {
          street: true
        }
      }
    }
  });

  if (!review) {
    return <div>Not found</div>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Review moderation</h1>
      <div className="rounded-xl bg-white p-6 shadow">
        <p className="font-medium">
          {review.building.street.name} {review.building.streetNumber}
        </p>
        <p>Status: {review.status}</p>
        <p>PII flagged: {review.piiFlagged ? `yes (${review.piiReasons.join(', ')})` : 'no'}</p>
        {review.comment ? <p className="mt-2 whitespace-pre-wrap">{review.comment}</p> : null}
      </div>

      <form action="/api/reviews/moderate" method="post" className="space-y-3 rounded-xl bg-white p-6 shadow">
        <input type="hidden" name="reviewId" value={review.id} />
        <select name="action" required>
          <option value="APPROVE">Approve</option>
          <option value="REJECT">Reject</option>
          <option value="REQUEST_CHANGES">Request changes</option>
          <option value="REMOVE">Remove</option>
        </select>
        <textarea name="message" placeholder="Reason or message" className="w-full" />
        <textarea name="redactedComment" placeholder="Optional redacted comment" className="w-full" />
        <button type="submit">Apply moderation</button>
      </form>
    </div>
  );
}
