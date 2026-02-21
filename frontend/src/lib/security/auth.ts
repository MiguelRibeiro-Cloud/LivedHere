import { cookies, headers } from 'next/headers';
import { UserRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { env, isProd } from '@/lib/env';
import { hashToken, randomToken } from '@/lib/utils';

const SESSION_COOKIE = 'lh_session';

export async function createSession(userId: string) {
  const raw = randomToken(32);
  const tokenHash = hashToken(`${raw}:${env.APP_SECRET}`);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);

  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt
    }
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, raw, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    expires: expiresAt
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({
      where: {
        tokenHash: hashToken(`${token}:${env.APP_SECRET}`)
      }
    });
  }

  cookieStore.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    expires: new Date(0)
  });
}

export async function getOptionalUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findFirst({
    where: {
      tokenHash: hashToken(`${token}:${env.APP_SECRET}`),
      expiresAt: { gt: new Date() }
    },
    include: {
      user: true
    }
  });

  if (!session || session.user.deletedAt) return null;
  return session.user;
}

export async function requireUser() {
  const user = await getOptionalUser();
  if (!user) {
    throw new Error('UNAUTHORIZED');
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== UserRole.ADMIN) {
    throw new Error('FORBIDDEN');
  }
  return user;
}

export async function createMagicLink(email: string) {
  const rawToken = randomToken(32);
  const tokenHash = hashToken(`${rawToken}:${env.APP_SECRET}`);
  const headerList = await headers();
  const ip = headerList.get('x-forwarded-for') || 'unknown';
  const userAgent = headerList.get('user-agent') || null;

  await prisma.magicLinkToken.create({
    data: {
      email,
      tokenHash,
      expiresAt: new Date(Date.now() + 1000 * 60 * 15),
      ip,
      userAgent
    }
  });

  return rawToken;
}

export async function consumeMagicLink(rawToken: string) {
  const tokenHash = hashToken(`${rawToken}:${env.APP_SECRET}`);
  const token = await prisma.magicLinkToken.findFirst({
    where: {
      tokenHash,
      usedAt: null,
      expiresAt: { gt: new Date() }
    }
  });

  if (!token) return null;

  await prisma.magicLinkToken.update({
    where: { id: token.id },
    data: { usedAt: new Date() }
  });

  const user = await prisma.user.upsert({
    where: { email: token.email },
    update: {},
    create: {
      email: token.email,
      displayName: token.email.split('@')[0]
    }
  });

  await createSession(user.id);
  return user;
}
