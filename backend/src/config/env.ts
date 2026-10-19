import 'dotenv/config'
import { z } from 'zod'
import { parseOrigins } from '../utils/parse-origins.js'

const environmentSchema = z.object({
  DATABASE_URL: z.string().url().startsWith('postgresql://'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // FRONTEND_URL is used for CORS. Supports comma-separated origins.
  FRONTEND_URL: z.string().default('http://localhost:5173,https://frontend-nu-six-46.vercel.app'),

  // FRONTEND_APP_URL is used to construct links inside emails
  // (e.g. /verify-email?token=… and /reset-password?token=…).
  FRONTEND_APP_URL: z.string().url().default('https://frontend-nu-six-46.vercel.app'),

  // Resend API key — required in production to send transactional email.
  RESEND_API_KEY: z.string().min(1).optional(),

  // The "from" address shown to recipients. Must be from a domain you
  // have verified in the Resend dashboard (or onboarding@resend.dev
  // for testing against your own address only).
  EMAIL_FROM: z.string().email().optional(),
}).superRefine((values, context) => {
  // In production FRONTEND_APP_URL must be supplied explicitly and use HTTPS.
  if (values.NODE_ENV === 'production' && !process.env['FRONTEND_APP_URL']) {
    context.addIssue({
      code: 'custom',
      message: 'FRONTEND_APP_URL is required in production',
      path: ['FRONTEND_APP_URL'],
    })
  }

  if (
    values.NODE_ENV === 'production' &&
    values.FRONTEND_APP_URL &&
    !values.FRONTEND_APP_URL.startsWith('https://')
  ) {
    context.addIssue({
      code: 'custom',
      message: 'FRONTEND_APP_URL must use HTTPS in production',
      path: ['FRONTEND_APP_URL'],
    })
  }

  // In production FRONTEND_URL must be supplied explicitly.
  if (values.NODE_ENV === 'production' && !process.env['FRONTEND_URL']) {
    context.addIssue({
      code: 'custom',
      message: 'FRONTEND_URL is required in production',
      path: ['FRONTEND_URL'],
    })
  }

  // In production both Resend credentials must be present together.
  if (values.NODE_ENV === 'production') {
    if (!values.RESEND_API_KEY) {
      context.addIssue({
        code: 'custom',
        message: 'RESEND_API_KEY is required in production for transactional email',
        path: ['RESEND_API_KEY'],
      })
    }
    if (!values.EMAIL_FROM) {
      context.addIssue({
        code: 'custom',
        message: 'EMAIL_FROM is required in production for transactional email',
        path: ['EMAIL_FROM'],
      })
    }
  }

  // Outside production, if only one of the two is set, remind the developer.
  if (values.NODE_ENV !== 'production') {
    const resendConfigured = [values.RESEND_API_KEY, values.EMAIL_FROM].filter(Boolean).length
    if (resendConfigured === 1) {
      context.addIssue({
        code: 'custom',
        message: 'RESEND_API_KEY and EMAIL_FROM must be configured together',
        path: ['RESEND_API_KEY'],
      })
    }
  }
})

const parsedEnvironment = environmentSchema.safeParse(process.env)

if (!parsedEnvironment.success) {
  console.error('Invalid environment configuration:', parsedEnvironment.error.flatten().fieldErrors)
  throw new Error('Invalid environment configuration')
}

const frontendOrigins = parseOrigins(parsedEnvironment.data.FRONTEND_URL)

if (frontendOrigins.length === 0) {
  throw new Error('FRONTEND_URL must include at least one allowed origin')
}

export const env = {
  ...parsedEnvironment.data,
  frontendOrigins,
  // emailConfigured is true only when both Resend credentials are present.
  // auth.service.ts checks this flag before attempting to send any email,
  // so no code path tries to deliver mail when the provider is not set up.
  emailConfigured: Boolean(
    parsedEnvironment.data.RESEND_API_KEY && parsedEnvironment.data.EMAIL_FROM,
  ),
}
