import type { Request, RequestHandler } from 'express'
import type { AuthenticatedUser } from '../modules/auth/auth.types.js'
import { prisma } from '../config/prisma.js'
import { UserRole } from '../generated/prisma/enums.js'
import { HttpError } from '../utils/http-error.js'
import { hashToken } from '../utils/secure-token.js'

export const authenticate: RequestHandler = async (request, _response, next) => {
  const authorization = request.get('authorization')
  const match = authorization?.match(/^Bearer ([A-Za-z0-9_-]{40,})$/)
  const token = match?.[1]

  if (!token) {
    next(new HttpError(401, 'AUTHENTICATION_REQUIRED', 'Authentication is required'))
    return
  }

  try {
    const session = await prisma.authSession.findFirst({
      where: {
        tokenHash: hashToken(token),
        expiresAt: { gt: new Date() },
        revokedAt: null,
        user: { isActive: true, emailVerifiedAt: { not: null } },
      },
      select: {
        id: true,
        userId: true,
        user: { select: { role: true } },
      },
    })

    if (!session) {
      next(new HttpError(401, 'INVALID_CREDENTIALS', 'Authentication is invalid or expired'))
      return
    }

    request.auth = {
      userId: session.userId,
      role: session.user.role,
      sessionId: session.id,
    }
    next()
  } catch (error) {
    next(error)
  }
}

export function requireRole(...roles: UserRole[]): RequestHandler {
  return (request, _response, next) => {
    if (!request.auth) {
      next(new HttpError(401, 'AUTHENTICATION_REQUIRED', 'Authentication is required'))
      return
    }

    if (!roles.includes(request.auth.role)) {
      next(new HttpError(403, 'FORBIDDEN', 'You are not permitted to perform this action'))
      return
    }
    next()
  }
}

export function getAuthenticatedUser(request: Request): AuthenticatedUser {
  if (!request.auth) {
    throw new HttpError(401, 'AUTHENTICATION_REQUIRED', 'Authentication is required')
  }
  return request.auth
}
