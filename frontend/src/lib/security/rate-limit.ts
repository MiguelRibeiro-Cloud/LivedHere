import { subHours } from '@/lib/time';
import { prisma } from '@/lib/prisma';

const windowHours = 24;

export async function enforceSubmissionRateLimits(params: {
  ip: string;
  fingerprint: string;
  buildingId: string;
}) {
  const since = subHours(new Date(), windowHours);

  const [ipCount, buildingCount, fpCount] = await Promise.all([
    prisma.review.count({ where: { submitIp: params.ip, createdAt: { gt: since } } }),
    prisma.review.count({ where: { buildingId: params.buildingId, createdAt: { gt: since } } }),
    prisma.review.count({ where: { submitFingerprint: params.fingerprint, createdAt: { gt: since } } })
  ]);

  if (ipCount >= 5 || buildingCount >= 5 || fpCount >= 3) {
    throw new Error('RATE_LIMIT_EXCEEDED');
  }

  await prisma.rateLimitEvent.create({
    data: {
      ip: params.ip,
      fingerprint: params.fingerprint,
      buildingId: params.buildingId,
      type: 'REVIEW_SUBMISSION'
    }
  });
}
