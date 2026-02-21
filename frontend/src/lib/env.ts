import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().default('3000'),
  DATABASE_URL: z.string().min(1),
  APP_SECRET: z.string().min(32),
  APP_URL: z.string().url().default('http://localhost:3000'),
  SEND_REAL_EMAIL: z.enum(['true', 'false']).default('false'),
  EMAIL_HOST: z.string().optional(),
  EMAIL_PORT: z.string().optional(),
  EMAIL_USER: z.string().optional(),
  EMAIL_PASS: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  CAPTCHA_PROVIDER: z.enum(['none', 'turnstile', 'recaptcha']).default('none'),
  CAPTCHA_SECRET: z.string().optional(),
  CAPTCHA_SITEKEY: z.string().optional(),
  CAPTCHA_REQUIRE_FOR_ALL: z.enum(['true', 'false']).default('false'),
  ADMIN_EMAIL: z.string().email(),
  POSTGRES_DB: z.string().optional(),
  POSTGRES_USER: z.string().optional(),
  POSTGRES_PASSWORD: z.string().optional(),
  POSTGRES_PORT: z.string().optional()
});

export const env = envSchema.parse(process.env);

export const isProd = env.NODE_ENV === 'production';
export const sendRealEmail = env.SEND_REAL_EMAIL === 'true';
export const requireCaptchaForAll = env.CAPTCHA_REQUIRE_FOR_ALL === 'true';
