import { Resend } from 'resend'
import { env } from '../../config/env.js'

// --------------------------------------------------------------------------
// Shared message shape — unchanged from the original SMTP implementation.
// auth.service.ts calls sendVerification() and sendPasswordReset() through
// the EmailDelivery interface; it never reaches into this module directly.
// --------------------------------------------------------------------------
type AccountMessage = {
  email: string
  name: string
  token: string
}

export interface EmailDelivery {
  sendVerification(message: AccountMessage): Promise<void>
  sendPasswordReset(message: AccountMessage): Promise<void>
}

// --------------------------------------------------------------------------
// ResendEmailDelivery
//
// Replaces SmtpEmailDelivery. Uses Resend's Node.js SDK instead of
// nodemailer so no SMTP host, port, or credentials are needed.
//
// Email links point to FRONTEND_APP_URL, exactly as they did before.
// Subjects and recipient logic are preserved verbatim.
// --------------------------------------------------------------------------
class ResendEmailDelivery implements EmailDelivery {
  // The Resend client is constructed once. env.RESEND_API_KEY is guaranteed
  // to be a non-empty string here because emailDelivery is only instantiated
  // when env.emailConfigured is true (checked in env.ts).
  private readonly client = new Resend(env.RESEND_API_KEY!)

  async sendVerification(message: AccountMessage): Promise<void> {
    const link = `${env.FRONTEND_APP_URL}/verify-email?token=${encodeURIComponent(message.token)}`

    const { error } = await this.client.emails.send({
      from: env.EMAIL_FROM!,
      to: message.email,
      subject: 'Verify your M-Service Desk email',
      // Plain-text body — identical wording to the original SMTP template.
      text: `Hello ${message.name}, verify your email: ${link}`,
    })

    if (error) {
      // Log a safe summary. Never log the API key, recipient address, or token.
      console.error('Resend delivery error (verification):', error.name, error.message)
      throw new Error('Email delivery failed')
    }
  }

  async sendPasswordReset(message: AccountMessage): Promise<void> {
    const link = `${env.FRONTEND_APP_URL}/reset-password?token=${encodeURIComponent(message.token)}`

    const { error } = await this.client.emails.send({
      from: env.EMAIL_FROM!,
      to: message.email,
      subject: 'Reset your M-Service Desk password',
      // Plain-text body — identical wording to the original SMTP template.
      text: `Hello ${message.name}, reset your password: ${link}`,
    })

    if (error) {
      // Log a safe summary. Never log the API key, recipient address, or token.
      console.error('Resend delivery error (password-reset):', error.name, error.message)
      throw new Error('Email delivery failed')
    }
  }
}

// --------------------------------------------------------------------------
// emailDelivery is null when Resend is not configured (dev without API key).
// auth.service.ts already handles the null case:
//   - register()               → skips sending, marks verificationEmailSent false
//   - requestPasswordReset()   → returns immediately (silent no-op)
//   - requestEmailVerification → returns immediately (silent no-op)
// --------------------------------------------------------------------------
export const emailDelivery: EmailDelivery | null = env.emailConfigured
  ? new ResendEmailDelivery()
  : null
