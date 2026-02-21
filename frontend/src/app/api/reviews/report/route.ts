import { NextResponse } from 'next/server';
import { getOptionalUser } from '@/lib/security/auth';
import { prisma } from '@/lib/prisma';
import { reportInputSchema } from '@/lib/validation';
import { assertSameOrigin } from '@/lib/security/csrf';

async function parseBody(request: Request) {
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return request.json();

  const form = await request.formData();
  return {
    reviewId: String(form.get('reviewId') || ''),
    reason: String(form.get('reason') || ''),
    details: form.get('details') ? String(form.get('details')) : null
  };
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
  } catch {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }

  const body = reportInputSchema.parse(await parseBody(request));
  const user = await getOptionalUser();

  await prisma.report.create({
    data: {
      reviewId: body.reviewId,
      reason: body.reason,
      details: body.details || null,
      reporterType: user ? 'USER' : 'ANONYMOUS',
      reporterUserId: user?.id || null
    }
  });

  return NextResponse.redirect(new URL(request.headers.get('referer') || '/en', request.url));
}
