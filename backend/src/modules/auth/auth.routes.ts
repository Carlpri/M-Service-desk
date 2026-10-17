import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { authenticate, getAuthenticatedUser } from '../../middleware/authenticate.js'
import * as authService from './auth.service.js'

const authRouter = Router()

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'RATE_LIMITED', message: 'Too many login attempts. Try again later.' },
})

const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'RATE_LIMITED', message: 'Too many registration attempts. Try again later.' },
})

const passwordResetRequestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'RATE_LIMITED', message: 'Too many requests. Try again later.' },
})

const passwordResetConsumeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'RATE_LIMITED', message: 'Too many requests. Try again later.' },
})

const emailVerificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'RATE_LIMITED', message: 'Too many requests. Try again later.' },
})

authRouter.post('/register', registrationLimiter, async (request, response) => {
  const result = await authService.register(request.body)
  response.status(201).json({
    message: result.verificationEmailSent
      ? 'Account created. Check your email to verify your address before signing in.'
      : 'Account created. Email verification is required; email delivery is not configured.',
    user: result.user,
  })
})

authRouter.post('/login', loginLimiter, async (request, response) => {
  const { sessionId: _sessionId, ...result } = await authService.login(request.body)
  response.status(200).json(result)
})

authRouter.post('/logout', authenticate, async (request, response) => {
  await authService.logout(getAuthenticatedUser(request).sessionId)
  response.status(200).json({ message: 'Logged out successfully' })
})

authRouter.get('/me', authenticate, async (request, response) => {
  response.json({ user: await authService.getCurrentUser(getAuthenticatedUser(request).userId) })
})

authRouter.post('/change-password', authenticate, async (request, response) => {
  await authService.changePassword(getAuthenticatedUser(request).userId, request.body)
  response.json({
    message: 'Password changed. Sign in again with your new password.',
    sessionsInvalidated: true,
  })
})

authRouter.post('/forgot-password', passwordResetRequestLimiter, async (request, response) => {
  await authService.requestPasswordReset(request.body)
  response.status(202).json({
    message: 'If an eligible account exists, the reset request will be processed. Email delivery requires SMTP configuration.',
  })
})

authRouter.post('/reset-password', passwordResetConsumeLimiter, async (request, response) => {
  await authService.resetPassword(request.body)
  response.json({
    message: 'Password reset successfully. Sign in with your new password.',
    sessionsInvalidated: true,
  })
})

authRouter.post('/verify-email', emailVerificationLimiter, async (request, response) => {
  await authService.verifyEmail(request.body)
  response.json({ message: 'Email verified. You can now sign in.' })
})

authRouter.post('/resend-verification', emailVerificationLimiter, async (request, response) => {
  await authService.requestEmailVerification(request.body)
  response.status(202).json({
    message: 'If an eligible account exists, the verification request will be processed. Email delivery requires SMTP configuration.',
  })
})

export default authRouter
