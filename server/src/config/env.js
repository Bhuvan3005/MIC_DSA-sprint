require('dotenv').config({ quiet: true });
const { z } = require('zod');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(5000),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_EXPIRES_DAYS: z.coerce.number().default(7),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  CROSS_SITE_COOKIES: z.enum(['true', 'false']).default('false'),
  PLATFORM_TIMEZONE: z.string().default('Asia/Kolkata'),
  CLOUDINARY_CLOUD_NAME: z.string().optional().default(''),
  CLOUDINARY_API_KEY: z.string().optional().default(''),
  CLOUDINARY_API_SECRET: z.string().optional().default(''),
  CLOUDINARY_FOLDER: z.string().default('codesprint/solutions'),
  VIDEO_MAX_SIZE_MB: z.coerce.number().default(500),
  VIDEO_ALLOWED_FORMATS: z.string().default('mp4,mov,webm,mkv'),
  ADMIN_EMAIL: z.string().optional().default(''),
  ADMIN_PASSWORD: z.string().optional().default(''),
  SMTP_HOST: z.string().optional().default(''),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  MAIL_FROM: z.string().default('CodeSprint <no-reply@codesprint.app>'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const msg = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  console.error(`Invalid environment configuration:\n${msg}\nSee server/.env.example`);
  process.exit(1);
}
const e = parsed.data;

module.exports = {
  ...e,
  isProd: e.NODE_ENV === 'production',
  isTest: e.NODE_ENV === 'test',
  crossSiteCookies: e.CROSS_SITE_COOKIES === 'true',
  clientOrigins: e.CLIENT_URL.split(',').map((s) => s.trim()),
  videoAllowedFormats: e.VIDEO_ALLOWED_FORMATS.split(',').map((s) => s.trim().toLowerCase()),
  videoMaxBytes: e.VIDEO_MAX_SIZE_MB * 1024 * 1024,
  cloudinaryConfigured: !!(e.CLOUDINARY_CLOUD_NAME && e.CLOUDINARY_API_KEY && e.CLOUDINARY_API_SECRET),
};
