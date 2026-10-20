import { z } from 'zod'

const emailSchema = z
  .string({ required_error: 'Email address is required' })
  .trim()
  .email('Invalid email address')
  .max(254, 'Email must be at most 254 characters')
  .transform((email) => email.toLowerCase())

export const registerSchema = z.object({
  name: z
    .string({ required_error: 'Full name is required' })
    .trim()
    .min(1, 'Full name is required')
    .max(100, 'Full name must be at most 100 characters'),
  email: emailSchema,
  password: z
    .string({ required_error: 'Password is required' })
    .min(12, 'Password must be at least 12 characters')
    .max(128, 'Password must be at most 128 characters'),
})

export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password is required')
    .max(128, 'Password must be at most 128 characters'),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required').max(128),
  newPassword: z.string().min(12, 'New password must be at least 12 characters').max(128),
})

export const requestTokenSchema = z.object({
  email: emailSchema,
})

export const consumeTokenSchema = z.object({
  token: z.string().min(1).max(256),
})

export const resetPasswordSchema = consumeTokenSchema.extend({
  newPassword: z.string().min(12).max(128),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
