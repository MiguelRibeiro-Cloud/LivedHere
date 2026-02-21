import { prisma } from '@/lib/prisma';
import { ModerationAction } from '@prisma/client';

export async function logModerationAction(params: {
  reviewId: string;
  actorUserId: string;
  action: ModerationAction;
  message?: string | null;
  beforeJson?: unknown;
  afterJson?: unknown;
}) {
  await prisma.moderationAudit.create({
    data: {
      reviewId: params.reviewId,
      actorUserId: params.actorUserId,
      action: params.action,
      message: params.message || null,
      beforeJson: params.beforeJson as never,
      afterJson: params.afterJson as never
    }
  });
}
