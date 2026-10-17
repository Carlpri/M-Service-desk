import { z } from 'zod'

const emailSchema = z.string().trim().email().max(254).transform((email) => email.toLowerCase())

export const registerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: emailSchema,
  password: z.string().min(12).max(128),
})

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(12).max(128),
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
