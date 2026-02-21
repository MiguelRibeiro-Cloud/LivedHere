import { NextResponse } from 'next/server';
import { consumeMagicLink } from '@/lib/security/auth';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const locale = searchParams.get('locale') || 'en';

  if (!token) {
    return NextResponse.redirect(new URL(`/${locale}/auth/login?error=missing_token`, request.url));
  }

  const user = await consumeMagicLink(token);
  if (!user) {
    return NextResponse.redirect(new URL(`/${locale}/auth/login?error=invalid_or_expired`, request.url));
  }

  return NextResponse.redirect(new URL(`/${locale}/account`, request.url));
}
