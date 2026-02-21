import { NextResponse } from 'next/server';
import { AuthorBadge, AuthorType, ReviewStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { reviewInputSchema } from '@/lib/validation';
import { computeOverallScore, getClientIp, hashToken, randomToken } from '@/lib/utils';
import { getOptionalUser } from '@/lib/security/auth';
import { verifyCaptcha } from '@/lib/security/captcha';
import { env, requireCaptchaForAll } from '@/lib/env';
import { scanPII } from '@/lib/security/pii';
import { enforceSubmissionRateLimits } from '@/lib/security/rate-limit';
import { assertSameOrigin } from '@/lib/security/csrf';

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
  } catch {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }

  const body = reviewInputSchema.parse(await request.json());
  const user = await getOptionalUser();
  const ip = getClientIp(request.headers);
  const localeFromHeader = request.headers.get('x-locale');
  const locale = localeFromHeader === 'pt' ? 'pt' : 'en';

  const cookieHeader = request.headers.get('cookie') || '';
  const existingFp = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('lh_fp='))
    ?.split('=')[1];
  const fingerprint = existingFp || crypto.randomUUID();

  const shouldCaptcha = !user || requireCaptchaForAll;
  if (shouldCaptcha && env.CAPTCHA_PROVIDER !== 'none') {
    const captchaOk = await verifyCaptcha(body.captchaToken || null, ip);
    if (!captchaOk) {
      return NextResponse.json({ error: 'Captcha verification failed.' }, { status: 400 });
    }
  }

  try {
    await enforceSubmissionRateLimits({ ip, fingerprint, buildingId: body.buildingId });
  } catch {
    return NextResponse.json(
      { error: 'Too many submissions in the last 24 hours. Please try again later.' },
      { status: 429 }
    );
  }

  const pii = scanPII(body.comment || '');
  if (pii.block) {
    return NextResponse.json(
      { error: 'Please remove personal details (unit, names, contact info).' },
      { status: 400 }
    );
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
  const trackingCode = randomToken(6).slice(0, 10).toUpperCase();
  const editToken = randomToken(24);

  const review = await prisma.review.create({
    data: {
      buildingId: body.buildingId,
      authorUserId: user?.id || null,
      authorType: user ? AuthorType.USER : AuthorType.ANONYMOUS,
      authorBadge: user ? AuthorBadge.VERIFIED_ACCOUNT : AuthorBadge.NONE,
      status: ReviewStatus.PENDING,
      trackingCode,
      editTokenHash: user ? null : hashToken(`${editToken}:${env.APP_SECRET}`),
      editTokenExpiresAt: user ? null : new Date(Date.now() + 1000 * 60 * 60 * 24 * 14),
      languageTag: body.languageTag || locale,
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
      submitIp: ip,
      submitFingerprint: fingerprint,
      contactEmail: body.contactEmail || null
    }
  });

  const response = NextResponse.json({
    message: 'Review submitted for moderation.',
    trackingCode: review.trackingCode,
    editLink: !user ? `${env.APP_URL}/${locale}/submit?trackingCode=${trackingCode}&editToken=${editToken}` : undefined
  });

  if (!existingFp) {
    response.cookies.set('lh_fp', fingerprint, {
      sameSite: 'lax',
      secure: env.NODE_ENV === 'production',
      httpOnly: false,
      maxAge: 60 * 60 * 24 * 365,
      path: '/'
    });
  }

  return response;
}
