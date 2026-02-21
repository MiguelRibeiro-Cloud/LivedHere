import { randomBytes, createHash } from 'crypto';

export function normalizeText(value: string): string {
  return value.trim().toLocaleLowerCase();
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex');
}

export function hashToken(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export function getClientIp(headers: Headers): string {
  const xForwardedFor = headers.get('x-forwarded-for');
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }
  return headers.get('x-real-ip') || 'unknown';
}

export function computeOverallScore(ratings: number[]): { exact: number; rounded: number } {
  const exact = Number((ratings.reduce((sum, value) => sum + value, 0) / ratings.length).toFixed(2));
  return { exact, rounded: Number(exact.toFixed(1)) };
}
