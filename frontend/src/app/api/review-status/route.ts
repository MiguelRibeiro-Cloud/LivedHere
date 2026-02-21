import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const trackingCode = searchParams.get('trackingCode');

  if (!trackingCode) {
    return NextResponse.json({ error: 'trackingCode is required' }, { status: 400 });
  }

  const review = await prisma.review.findUnique({
    where: { trackingCode },
    select: {
      trackingCode: true,
      status: true,
      moderationMessage: true,
      updatedAt: true
    }
  });

  if (!review) {
    return NextResponse.json({ error: 'Review not found' }, { status: 404 });
  }

  return NextResponse.json(review);
}
