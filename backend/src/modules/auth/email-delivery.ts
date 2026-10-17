import nodemailer from 'nodemailer'
import { env } from '../../config/env.js'

type AccountMessage = {
  email: string
  name: string
  token: string
}

export interface EmailDelivery {
  sendVerification(message: AccountMessage): Promise<void>
  sendPasswordReset(message: AccountMessage): Promise<void>
}

class SmtpEmailDelivery implements EmailDelivery {
  private readonly transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    requireTLS: env.SMTP_PORT !== 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASSWORD,
    },
  })

  async sendVerification(message: AccountMessage): Promise<void> {
    await this.transporter.sendMail({
      from: env.EMAIL_FROM,
      to: message.email,
      subject: 'Verify your M-Service Desk email',
      text: `Hello ${message.name}, verify your email: ${env.FRONTEND_APP_URL}/verify-email?token=${encodeURIComponent(message.token)}`,
    })
  }

  async sendPasswordReset(message: AccountMessage): Promise<void> {
    await this.transporter.sendMail({
      from: env.EMAIL_FROM,
      to: message.email,
      subject: 'Reset your M-Service Desk password',
      text: `Hello ${message.name}, reset your password: ${env.FRONTEND_APP_URL}/reset-password?token=${encodeURIComponent(message.token)}`,
    })
  }
}

export const emailDelivery: EmailDelivery | null = env.emailConfigured
  ? new SmtpEmailDelivery()
  : null
