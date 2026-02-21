import { NextResponse } from 'next/server';
import { moderateInputSchema } from '@/lib/validation';
import { requireAdmin } from '@/lib/security/auth';
import { prisma } from '@/lib/prisma';
import { logModerationAction } from '@/lib/audit';
import { sendStatusEmail } from '@/lib/email';
import { moderationActionToStatus } from '@/lib/review-state';
import { assertModerationPayload } from '@/lib/moderation-rules';
import { assertSameOrigin } from '@/lib/security/csrf';

async function parseBody(request: Request) {
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return await request.json();
  }
  const form = await request.formData();
  return {
    reviewId: String(form.get('reviewId') || ''),
    action: String(form.get('action') || ''),
    message: form.get('message') ? String(form.get('message')) : null,
    redactedComment: form.get('redactedComment') ? String(form.get('redactedComment')) : null
  };
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
  } catch {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }

  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const body = moderateInputSchema.parse(await parseBody(request));
  try {
    assertModerationPayload(body.action, body.message);
  } catch {
    return NextResponse.json(
      { error: 'Reason/message is required for reject and request changes.' },
      { status: 400 }
    );
  }

  const review = await prisma.review.findUnique({ where: { id: body.reviewId } });
  if (!review) {
    return NextResponse.json({ error: 'Review not found' }, { status: 404 });
  }

  const nextStatus = moderationActionToStatus(body.action);

  const update = await prisma.review.update({
    where: { id: review.id },
    data: {
      status: nextStatus,
      moderationMessage: body.message || null,
      comment: body.redactedComment || review.comment,
      approvedAt: body.action === 'APPROVE' ? new Date() : review.approvedAt,
      removedAt: body.action === 'REMOVE' ? new Date() : review.removedAt,
      lastModerationAction: body.action,
      moderatedByUserId: admin.id
    }
  });

  await logModerationAction({
    reviewId: review.id,
    actorUserId: admin.id,
    action: body.action,
    message: body.message,
    beforeJson: review,
    afterJson: update
  });

  if (review.contactEmail) {
    await sendStatusEmail(
      review.contactEmail,
      `LivedHere review ${nextStatus}`,
      `Your review status is now ${nextStatus}. ${body.message || ''}`
    );
  }

  return NextResponse.redirect(new URL(request.headers.get('referer') || '/en/admin/reviews', request.url));
}
