import { env } from '@/lib/env';

export async function verifyCaptcha(token: string | null, ip: string): Promise<boolean> {
  if (env.CAPTCHA_PROVIDER === 'none') return true;
  if (!token || !env.CAPTCHA_SECRET) return false;

  if (env.CAPTCHA_PROVIDER === 'turnstile') {
    const body = new URLSearchParams({
      secret: env.CAPTCHA_SECRET,
      response: token,
      remoteip: ip
    });
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body
    });
    const json = (await response.json()) as { success?: boolean };
    return Boolean(json.success);
  }

  const body = new URLSearchParams({
    secret: env.CAPTCHA_SECRET,
    response: token
  });
  const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    body
  });
  const json = (await response.json()) as { success?: boolean };
  return Boolean(json.success);
}
