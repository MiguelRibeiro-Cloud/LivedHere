import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { reviewInputSchema } from '@/lib/validation';
import { computeOverallScore, hashToken } from '@/lib/utils';
import { env } from '@/lib/env';
import { getOptionalUser } from '@/lib/security/auth';
import { scanPII } from '@/lib/security/pii';
import { assertSameOrigin } from '@/lib/security/csrf';

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
  } catch {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }

  const body = reviewInputSchema
    .extend({ trackingCode: reviewInputSchema.shape.trackingCode, editToken: reviewInputSchema.shape.editToken })
    .parse(await request.json());

  if (!body.trackingCode) {
    return NextResponse.json({ error: 'Tracking code is required' }, { status: 400 });
  }

  const review = await prisma.review.findUnique({ where: { trackingCode: body.trackingCode } });
  if (!review) return NextResponse.json({ error: 'Review not found' }, { status: 404 });
  if (review.status !== 'CHANGES_REQUESTED') {
    return NextResponse.json({ error: 'Review is not editable right now' }, { status: 400 });
  }

  const user = await getOptionalUser();
  if (review.authorUserId) {
    if (!user || user.id !== review.authorUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  } else {
    if (!body.editToken || !review.editTokenHash || !review.editTokenExpiresAt) {
      return NextResponse.json({ error: 'Missing edit token' }, { status: 401 });
    }
    const tokenHash = hashToken(`${body.editToken}:${env.APP_SECRET}`);
    if (tokenHash !== review.editTokenHash || review.editTokenExpiresAt < new Date()) {
      return NextResponse.json({ error: 'Invalid edit token' }, { status: 401 });
    }
  }

  const pii = scanPII(body.comment || '');
  if (pii.block) {
    return NextResponse.json({ error: 'Please remove personal details (unit, names, contact info).' }, { status: 400 });
  }

  const ratings = [
    body.peopleNoise,
    body.animalNoise,
    body.insulation,
    body.pestIssues,
    body.areaSafety,
    body.neighbourhoodVibe,
    body.outdoorSpaces,
    body.parking,
    body.buildingMaintenance,
    body.constructionQuality
  ];
  const score = computeOverallScore(ratings);

  const beforeJson = review;

  const updated = await prisma.review.update({
    where: { id: review.id },
    data: {
      status: 'PENDING',
      livedFromYear: body.livedFromYear,
      livedToYear: body.livedToYear,
      livedDurationMonths: body.livedDurationMonths,
      peopleNoise: body.peopleNoise,
      animalNoise: body.animalNoise,
      insulation: body.insulation,
      pestIssues: body.pestIssues,
      areaSafety: body.areaSafety,
      neighbourhoodVibe: body.neighbourhoodVibe,
      outdoorSpaces: body.outdoorSpaces,
      parking: body.parking,
      buildingMaintenance: body.buildingMaintenance,
      constructionQuality: body.constructionQuality,
      overallScore: score.exact,
      overallScoreRounded: score.rounded,
      comment: body.comment || null,
      piiFlagged: pii.flagged,
      piiReasons: pii.reasons,
      moderationMessage: null
    }
  });

  await prisma.reviewEditHistory.create({
    data: {
      reviewId: review.id,
      editorType: 'AUTHOR',
      beforeJson: beforeJson as never,
      afterJson: updated as never
    }
  });

  return NextResponse.json({ message: 'Review resubmitted for moderation.' });
}
