import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createMagicLink } from '@/lib/security/auth';
import { sendMagicLinkEmail } from '@/lib/email';
import { env } from '@/lib/env';
import { assertSameOrigin } from '@/lib/security/csrf';

const schema = z.object({
  email: z.string().email(),
  locale: z.enum(['en', 'pt']).default('en')
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
  } catch {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }

  const body = schema.parse(await request.json());

  const token = await createMagicLink(body.email.toLowerCase());
  const link = `${env.APP_URL}/${body.locale}/auth/callback?token=${encodeURIComponent(token)}&locale=${body.locale}`;

  await sendMagicLinkEmail(body.email, link);

  if (env.SEND_REAL_EMAIL === 'false' && env.NODE_ENV !== 'production') {
    return NextResponse.json({
      message: 'Check server logs for your login link.',
      devLink: link
    });
  }

  return NextResponse.json({ message: 'Magic link sent if the email is valid.' });
}
