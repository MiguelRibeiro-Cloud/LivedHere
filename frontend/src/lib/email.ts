import nodemailer from 'nodemailer';
import { env, sendRealEmail } from '@/lib/env';

const transporter = sendRealEmail
  ? nodemailer.createTransport({
      host: env.EMAIL_HOST,
      port: Number(env.EMAIL_PORT || 587),
      secure: Number(env.EMAIL_PORT || 587) === 465,
      auth: env.EMAIL_USER && env.EMAIL_PASS ? { user: env.EMAIL_USER, pass: env.EMAIL_PASS } : undefined
    })
  : null;

export async function sendMagicLinkEmail(email: string, magicLink: string) {
  if (!sendRealEmail || !transporter) {
    console.log(`[DEV MAGIC LINK] ${email}: ${magicLink}`);
    return;
  }

  await transporter.sendMail({
    to: email,
    from: env.EMAIL_FROM || 'noreply@livedhere.local',
    subject: 'Your LivedHere login link',
    text: `Click to login: ${magicLink}\nThis link expires in 15 minutes.`
  });
}

export async function sendStatusEmail(email: string, subject: string, text: string) {
  if (!sendRealEmail || !transporter) {
    return;
  }

  await transporter.sendMail({
    to: email,
    from: env.EMAIL_FROM || 'noreply@livedhere.local',
    subject,
    text
  });
}
