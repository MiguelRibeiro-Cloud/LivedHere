import { env } from '@/lib/env';

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return;

  const appOrigin = new URL(env.APP_URL).origin;
  if (origin !== appOrigin) {
    throw new Error('CSRF_ORIGIN_MISMATCH');
  }
}
