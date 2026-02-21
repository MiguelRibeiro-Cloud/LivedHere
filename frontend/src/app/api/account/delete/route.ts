import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { clearSession, requireUser } from '@/lib/security/auth';
import { assertSameOrigin } from '@/lib/security/csrf';

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
  } catch {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }

  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        deletedAt: new Date(),
        displayName: 'Deleted user'
      }
    }),
    prisma.review.updateMany({
      where: { authorUserId: user.id },
      data: {
        authorUserId: null,
        authorType: 'ANONYMOUS',
        authorBadge: 'NONE',
        contactEmail: null
      }
    })
  ]);

  await clearSession();

  return NextResponse.json({ message: 'Account deleted and reviews anonymized.' });
}
