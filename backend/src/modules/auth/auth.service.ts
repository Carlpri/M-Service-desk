import { UserRole } from '../../generated/prisma/enums.js'
import { prisma } from '../../config/prisma.js'
import { env } from '../../config/env.js'
import { emailDelivery } from './email-delivery.js'
import {
  changePasswordSchema,
  consumeTokenSchema,
  loginSchema,
  registerSchema,
  requestTokenSchema,
  resetPasswordSchema,
} from './auth.schemas.js'
import { hashPassword, verifyPassword } from './password.js'
import { createSecureToken, hashToken } from '../../utils/secure-token.js'
import { HttpError } from '../../utils/http-error.js'

const SESSION_LIFETIME_MS = 12 * 60 * 60 * 1000
const RESET_TOKEN_LIFETIME_MS = 30 * 60 * 1000
const VERIFICATION_TOKEN_LIFETIME_MS = 24 * 60 * 60 * 1000
const DUMMY_PASSWORD_HASH =
  '$argon2id$v=19$m=19456,p=1,t=2$p362cOTRNmwjWKtXHHjZCw$NaPMA94Jr/DbZ5cuOVnxomzp7jsIwBvXrtDlHvJKUgA'
const invalidCredentials = () => new HttpError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect')

function publicUser(user: {
  id: string
  name: string
  email: string
  role: UserRole
  isActive: boolean
  emailVerifiedAt: Date | null
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    emailVerifiedAt: user.emailVerifiedAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
}

async function createVerificationToken(userId: string): Promise<string> {
  const token = createSecureToken()
  const now = new Date()

  await prisma.$transaction(async (transaction) => {
    await transaction.emailVerificationToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: now },
    })
    await transaction.emailVerificationToken.create({
      data: {
        userId,
        tokenHash: hashToken(token),
        expiresAt: new Date(now.getTime() + VERIFICATION_TOKEN_LIFETIME_MS),
      },
    })
  })

  return token
}

export async function register(input: unknown) {
  const data = registerSchema.parse(input)
  const passwordHash = await hashPassword(data.password)

  const isDevAutoVerify = !env.emailConfigured

  let user
  try {
    user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        role: UserRole.CITIZEN,
        emailVerifiedAt: isDevAutoVerify ? new Date() : null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        emailVerifiedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    ) {
      throw new HttpError(409, 'EMAIL_ALREADY_REGISTERED', 'An account with this email already exists')
    }
    throw error
  }

  let verificationEmailSent = false
  if (emailDelivery) {
    const token = await createVerificationToken(user.id)
    try {
      await emailDelivery.sendVerification({ email: user.email, name: user.name, token })
      verificationEmailSent = true
    } catch {
      console.error('Verification email delivery failed')
      throw new HttpError(
        502,
        'EMAIL_DELIVERY_FAILED',
        'Account created, but verification email delivery failed. Request a new verification email.',
      )
    }
  }

  return {
    user: publicUser(user),
    verificationEmailSent,
  }
}

export async function login(input: unknown) {
  const data = loginSchema.parse(input)
  const user = await prisma.user.findUnique({
    where: { email: data.email },
  })
  const passwordMatches = await verifyPassword(user?.passwordHash ?? DUMMY_PASSWORD_HASH, data.password)
  if (!user || !user.isActive || !user.emailVerifiedAt || !passwordMatches) {
    throw invalidCredentials()
  }

  const token = createSecureToken()
  const expiresAt = new Date(Date.now() + SESSION_LIFETIME_MS)
  const session = await prisma.authSession.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt,
    },
    select: { id: true },
  })

  return {
    token,
    tokenType: 'Bearer' as const,
    expiresAt,
    user: publicUser(user),
    sessionId: session.id,
  }
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      emailVerifiedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  if (!user || !user.isActive || !user.emailVerifiedAt) {
    throw invalidCredentials()
  }
  return publicUser(user)
}

export async function logout(sessionId: string): Promise<void> {
  await prisma.authSession.update({
    where: { id: sessionId },
    data: { revokedAt: new Date() },
  })
}

export async function changePassword(userId: string, input: unknown): Promise<void> {
  const data = changePasswordSchema.parse(input)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, passwordHash: true },
  })
  if (!user) throw invalidCredentials()

  if (!(await verifyPassword(user.passwordHash, data.currentPassword))) {
    throw new HttpError(400, 'CURRENT_PASSWORD_INVALID', 'Current password is incorrect')
  }

  const newPasswordHash = await hashPassword(data.newPassword)
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    }),
    prisma.authSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
    prisma.passwordResetToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    }),
  ])
}

export async function requestPasswordReset(input: unknown): Promise<void> {
  const { email } = requestTokenSchema.parse(input)
  if (!emailDelivery) return

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, isActive: true },
  })
  if (!user || !user.isActive) return

  const token = createSecureToken()
  const now = new Date()
  await prisma.$transaction(async (transaction) => {
    await transaction.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: now },
    })
    await transaction.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(now.getTime() + RESET_TOKEN_LIFETIME_MS),
      },
    })
  })

  try {
    await emailDelivery.sendPasswordReset({ email: user.email, name: user.name, token })
  } catch {
    console.error('Password reset email delivery failed')
  }
}

export async function resetPassword(input: unknown): Promise<void> {
  const data = resetPasswordSchema.parse(input)
  const tokenHash = hashToken(data.token)
  const now = new Date()
  const passwordHash = await hashPassword(data.newPassword)

  await prisma.$transaction(async (transaction) => {
    const resetToken = await transaction.passwordResetToken.findFirst({
      where: { tokenHash, usedAt: null, expiresAt: { gt: now }, user: { isActive: true } },
      select: { id: true, userId: true },
    })
    if (!resetToken) {
      throw new HttpError(400, 'RESET_TOKEN_INVALID', 'Password reset token is invalid or expired')
    }

    const consumed = await transaction.passwordResetToken.updateMany({
      where: { id: resetToken.id, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    })
    if (consumed.count !== 1) {
      throw new HttpError(400, 'RESET_TOKEN_INVALID', 'Password reset token is invalid or expired')
    }

    await transaction.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash },
    })
    await transaction.authSession.updateMany({
      where: { userId: resetToken.userId, revokedAt: null },
      data: { revokedAt: now },
    })
    await transaction.passwordResetToken.updateMany({
      where: { userId: resetToken.userId, usedAt: null },
      data: { usedAt: now },
    })
  })
}

export async function requestEmailVerification(input: unknown): Promise<void> {
  const { email } = requestTokenSchema.parse(input)
  if (!emailDelivery) return

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, isActive: true, emailVerifiedAt: true },
  })
  if (!user || !user.isActive || user.emailVerifiedAt) return

  const token = await createVerificationToken(user.id)
  try {
    await emailDelivery.sendVerification({ email: user.email, name: user.name, token })
  } catch {
    console.error('Verification email delivery failed')
  }
}

export async function verifyEmail(input: unknown): Promise<void> {
  const { token } = consumeTokenSchema.parse(input)
  const tokenHash = hashToken(token)
  const now = new Date()

  await prisma.$transaction(async (transaction) => {
    const verificationToken = await transaction.emailVerificationToken.findFirst({
      where: { tokenHash, usedAt: null, expiresAt: { gt: now }, user: { isActive: true } },
      select: { id: true, userId: true },
    })
    if (!verificationToken) {
      throw new HttpError(400, 'VERIFICATION_TOKEN_INVALID', 'Verification token is invalid or expired')
    }

    const consumed = await transaction.emailVerificationToken.updateMany({
      where: { id: verificationToken.id, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    })
    if (consumed.count !== 1) {
      throw new HttpError(400, 'VERIFICATION_TOKEN_INVALID', 'Verification token is invalid or expired')
    }

    await transaction.user.update({
      where: { id: verificationToken.userId },
      data: { emailVerifiedAt: now },
    })
  })
}

export async function listUsers(page: number, pageSize: number) {
  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        emailVerifiedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.user.count(),
  ])

  return { users: users.map(publicUser), page, pageSize, total }
}

export async function pruneExpiredSessionsAndTokens(): Promise<{
  sessionsDeleted: number
  resetTokensDeleted: number
  verificationTokensDeleted: number
}> {
  const now = new Date()
  const [sessions, resetTokens, verificationTokens] = await prisma.$transaction([
    prisma.authSession.deleteMany({
      where: {
        OR: [{ expiresAt: { lt: now } }, { revokedAt: { not: null } }],
      },
    }),
    prisma.passwordResetToken.deleteMany({
      where: {
        OR: [{ expiresAt: { lt: now } }, { usedAt: { not: null } }],
      },
    }),
    prisma.emailVerificationToken.deleteMany({
      where: {
        OR: [{ expiresAt: { lt: now } }, { usedAt: { not: null } }],
      },
    }),
  ])

  return {
    sessionsDeleted: sessions.count,
    resetTokensDeleted: resetTokens.count,
    verificationTokensDeleted: verificationTokens.count,
  }
}
