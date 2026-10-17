import 'dotenv/config'
import { z } from 'zod'
import { parseOrigins } from '../utils/parse-origins.js'

const environmentSchema = z.object({
  DATABASE_URL: z.string().url().startsWith('postgresql://'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  SMTP_HOST: z.string().min(1).optional(),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).optional(),
  SMTP_USER: z.string().min(1).optional(),
  SMTP_PASSWORD: z.string().min(1).optional(),
  EMAIL_FROM: z.string().email().optional(),
  FRONTEND_APP_URL: z.string().url().default('http://localhost:5173'),
}).superRefine((values, context) => {
  const mailSettings = [
    values.SMTP_HOST,
    values.SMTP_PORT,
    values.SMTP_USER,
    values.SMTP_PASSWORD,
    values.EMAIL_FROM,
  ]
  const configuredCount = mailSettings.filter((value) => value !== undefined).length

  if (configuredCount !== 0 && configuredCount !== mailSettings.length) {
    context.addIssue({
      code: 'custom',
      message: 'SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, and EMAIL_FROM must be configured together',
      path: ['SMTP_HOST'],
    })
  }

  if (values.NODE_ENV === 'production' && configuredCount !== mailSettings.length) {
    context.addIssue({
      code: 'custom',
      message: 'Email delivery settings are required in production',
      path: ['SMTP_HOST'],
    })
  }

  if (values.NODE_ENV === 'production' && !process.env.FRONTEND_APP_URL) {
    context.addIssue({
      code: 'custom',
      message: 'FRONTEND_APP_URL is required in production',
      path: ['FRONTEND_APP_URL'],
    })
  }

  if (values.NODE_ENV === 'production' && !process.env.FRONTEND_URL) {
    context.addIssue({
      code: 'custom',
      message: 'FRONTEND_URL is required in production',
      path: ['FRONTEND_URL'],
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
  emailConfigured: Boolean(
    parsedEnvironment.data.SMTP_HOST &&
      parsedEnvironment.data.SMTP_PORT &&
      parsedEnvironment.data.SMTP_USER &&
      parsedEnvironment.data.SMTP_PASSWORD &&
      parsedEnvironment.data.EMAIL_FROM,
  ),
}
