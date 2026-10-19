import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import argon2 from 'argon2'

const mocks = vi.hoisted(() => ({
  prisma: {
    user: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
    authSession: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    passwordResetToken: {
      create: vi.fn(),
      findFirst: vi.fn(),
      updateMany: vi.fn(),
    },
    emailVerificationToken: {
      create: vi.fn(),
      findFirst: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
    $queryRaw: vi.fn(),
  },
}))

vi.mock('../../config/prisma.js', () => ({ prisma: mocks.prisma }))
vi.mock('./email-delivery.js', () => ({ emailDelivery: null }))

import app from '../../app.js'
import { hashPassword } from './password.js'

const citizen = {
  id: 'citizen-id',
  name: 'Amina Citizen',
  email: 'amina@example.com',
  role: 'CITIZEN',
  isActive: true,
  emailVerifiedAt: new Date('2026-01-01T00:00:00.000Z'),
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.prisma.$queryRaw.mockResolvedValue([])
  mocks.prisma.$transaction.mockResolvedValue([])
})

describe('authentication routes', () => {
  it('registers a citizen with a normalized email and hashed password, never a public role', async () => {
    mocks.prisma.user.create.mockResolvedValue(citizen)

    const response = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Amina Citizen',
        email: ' AMINA@Example.com ',
        password: 'correct horse battery',
        role: 'ADMIN',
      })

    expect(response.status).toBe(201)
    expect(response.body.user).not.toHaveProperty('passwordHash')
    expect(mocks.prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'amina@example.com',
          role: 'CITIZEN',
        }),
      }),
    )
    const savedPassword: unknown = mocks.prisma.user.create.mock.calls[0]?.[0].data.passwordHash
    if (typeof savedPassword !== 'string') throw new Error('Expected password hash to be stored')
    expect(savedPassword).not.toBe('correct horse battery')
    expect(await argon2.verify(savedPassword, 'correct horse battery')).toBe(true)
  })

  it('rejects invalid registration and duplicate email addresses', async () => {
    const invalidResponse = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Amina', email: 'not-an-email', password: 'short' })

    expect(invalidResponse.status).toBe(400)
    expect(invalidResponse.body.error).toBe('VALIDATION_ERROR')
    expect(mocks.prisma.user.create).not.toHaveBeenCalled()

    mocks.prisma.user.create.mockRejectedValue({ code: 'P2002' })
    const duplicateResponse = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Amina', email: 'amina@example.com', password: 'correct horse battery' })

    expect(duplicateResponse.status).toBe(409)
    expect(duplicateResponse.body.error).toBe('EMAIL_ALREADY_REGISTERED')
  })

  it('logs in a verified account and stores only a hash of the opaque session token', async () => {
    const passwordHash = await hashPassword('correct horse battery')
    mocks.prisma.user.findUnique.mockResolvedValue({ ...citizen, passwordHash })
    mocks.prisma.authSession.create.mockResolvedValue({ id: 'session-id' })

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'AMINA@example.com', password: 'correct horse battery' })

    expect(response.status).toBe(200)
    expect(response.body.tokenType).toBe('Bearer')
    expect(response.body.user).not.toHaveProperty('passwordHash')
    const sessionData = mocks.prisma.authSession.create.mock.calls[0]?.[0].data
    expect(sessionData.tokenHash).not.toBe(response.body.token)
    expect(sessionData.tokenHash).toMatch(/^[a-f0-9]{64}$/)
  })

  it('returns the same login error for nonexistent and unverified accounts', async () => {
    mocks.prisma.user.findUnique.mockResolvedValue(null)
    const missing = await request(app)
      .post('/api/auth/login')
      .send({ email: 'missing@example.com', password: 'wrong password' })

    const unverifiedPasswordHash = await hashPassword('correct horse battery')
    mocks.prisma.user.findUnique.mockResolvedValue({
      ...citizen,
      emailVerifiedAt: null,
      passwordHash: unverifiedPasswordHash,
    })
    const unverified = await request(app)
      .post('/api/auth/login')
      .send({ email: 'amina@example.com', password: 'wrong password' })

    expect(missing.status).toBe(401)
    expect(unverified.status).toBe(401)
    expect(missing.body).toEqual(unverified.body)
  })

  it('rejects inactive accounts with the same generic login error', async () => {
    const inactivePasswordHash = await hashPassword('correct horse battery')
    mocks.prisma.user.findUnique.mockResolvedValue({
      ...citizen,
      isActive: false,
      passwordHash: inactivePasswordHash,
    })

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: citizen.email, password: 'correct horse battery' })

    expect(response.status).toBe(401)
    expect(response.body.error).toBe('INVALID_CREDENTIALS')
  })

  it('requires a valid session to access the current-user route', async () => {
    const missingToken = await request(app).get('/api/auth/me')
    expect(missingToken.status).toBe(401)
    expect(mocks.prisma.authSession.findFirst).not.toHaveBeenCalled()

    mocks.prisma.authSession.findFirst.mockResolvedValue(null)
    const invalidToken = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid-token')
    expect(invalidToken.status).toBe(401)
  })

  it('returns the authenticated profile and blocks citizens from the administrator user list', async () => {
    mocks.prisma.authSession.findFirst.mockResolvedValue({
      id: 'session-id',
      userId: citizen.id,
      user: { role: 'CITIZEN' },
    })
    mocks.prisma.user.findUnique.mockResolvedValue(citizen)

    const profile = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${'a'.repeat(43)}`)
    const adminList = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${'a'.repeat(43)}`)
    mocks.prisma.authSession.findFirst.mockResolvedValue({
      id: 'admin-session',
      userId: 'admin-id',
      user: { role: 'ADMIN' },
    })
    mocks.prisma.$transaction.mockResolvedValue([[], 0])
    const authorizedAdminList = await request(app)
      .get('/api/admin/users?page=1&pageSize=20')
      .set('Authorization', `Bearer ${'d'.repeat(43)}`)

    expect(profile.status).toBe(200)
    expect(profile.body.user).not.toHaveProperty('passwordHash')
    expect(adminList.status).toBe(403)
    expect(authorizedAdminList.status).toBe(200)
    expect(authorizedAdminList.body).toEqual({ users: [], page: 1, pageSize: 20, total: 0 })
  })

  it('revokes the authenticated session on logout', async () => {
    mocks.prisma.authSession.findFirst.mockResolvedValue({
      id: 'session-id',
      userId: citizen.id,
      user: { role: 'CITIZEN' },
    })
    mocks.prisma.authSession.update.mockResolvedValue({ id: 'session-id' })

    const response = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${'b'.repeat(43)}`)

    expect(response.status).toBe(200)
    expect(mocks.prisma.authSession.update).toHaveBeenCalledWith({
      where: { id: 'session-id' },
      data: { revokedAt: expect.any(Date) },
    })
  })

  it('requires the current password and invalidates sessions after a password change', async () => {
    const passwordHash = await hashPassword('current secure password')
    mocks.prisma.authSession.findFirst.mockResolvedValue({
      id: 'session-id',
      userId: citizen.id,
      user: { role: 'CITIZEN' },
    })
    mocks.prisma.user.findUnique.mockResolvedValue({ id: citizen.id, passwordHash })

    const invalid = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${'c'.repeat(43)}`)
      .send({ currentPassword: 'incorrect password', newPassword: 'new secure password' })
    expect(invalid.status).toBe(400)

    const changed = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${'c'.repeat(43)}`)
      .send({ currentPassword: 'current secure password', newPassword: 'new secure password' })

    expect(changed.status).toBe(200)
    expect(changed.body.sessionsInvalidated).toBe(true)
    expect(mocks.prisma.$transaction).toHaveBeenCalledTimes(1)
    expect(mocks.prisma.authSession.updateMany).toHaveBeenCalledWith({
      where: { userId: citizen.id, revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    })
  })

  it('keeps password-reset requests generic when email delivery is not configured', async () => {
    const response = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'amina@example.com' })

    expect(response.status).toBe(202)
    expect(response.body.message).toMatch(/if an eligible account exists/i)
    expect(mocks.prisma.user.findUnique).not.toHaveBeenCalled()
  })

  it('rejects expired or reused reset and verification tokens', async () => {
    mocks.prisma.$transaction.mockImplementation(async (operation) => {
      if (typeof operation !== 'function') return Promise.all(operation)
      return operation({
        passwordResetToken: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
        emailVerificationToken: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
      })
    })

    const reset = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'expired-reset-token', newPassword: 'new secure password' })
    const verify = await request(app)
      .post('/api/auth/verify-email')
      .send({ token: 'already-used-verification-token' })

    expect(reset.status).toBe(400)
    expect(reset.body.error).toBe('RESET_TOKEN_INVALID')
    expect(verify.status).toBe(400)
    expect(verify.body.error).toBe('VERIFICATION_TOKEN_INVALID')
  })

  it('consumes a valid email-verification token only once', async () => {
    const findFirst = vi.fn()
      .mockResolvedValueOnce({ id: 'verification-id', userId: citizen.id })
      .mockResolvedValue(null)
    const transaction = {
      emailVerificationToken: {
        findFirst,
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      user: {
        update: vi.fn().mockResolvedValue(citizen),
      },
    }
    mocks.prisma.$transaction.mockImplementation(async (operation) => {
      if (typeof operation !== 'function') return Promise.all(operation)
      return operation(transaction)
    })

    const firstUse = await request(app)
      .post('/api/auth/verify-email')
      .send({ token: 'one-time-verification-token' })
    const secondUse = await request(app)
      .post('/api/auth/verify-email')
      .send({ token: 'one-time-verification-token' })

    expect(firstUse.status).toBe(200)
    expect(secondUse.status).toBe(400)
    expect(transaction.emailVerificationToken.updateMany).toHaveBeenCalledWith({
      where: { id: 'verification-id', usedAt: null, expiresAt: { gt: expect.any(Date) } },
      data: { usedAt: expect.any(Date) },
    })
  })

  it('resets a password and revokes sessions in one transaction', async () => {
    const findFirst = vi.fn()
      .mockResolvedValueOnce({ id: 'reset-id', userId: citizen.id })
      .mockResolvedValue(null)
    const transaction = {
      passwordResetToken: {
        findFirst,
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      user: {
        update: vi.fn().mockResolvedValue(citizen),
      },
      authSession: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    }
    mocks.prisma.$transaction.mockImplementation(async (operation) => {
      if (typeof operation !== 'function') return Promise.all(operation)
      return operation(transaction)
    })

    const response = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'valid-reset-token', newPassword: 'another secure passphrase' })
    const secondUse = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'valid-reset-token', newPassword: 'another secure passphrase' })

    expect(response.status).toBe(200)
    expect(response.body.sessionsInvalidated).toBe(true)
    expect(secondUse.status).toBe(400)
    expect(findFirst.mock.calls[0]?.[0].where.expiresAt.gt).toBeInstanceOf(Date)
    expect(findFirst.mock.calls[0]?.[0].where.tokenHash).not.toBe('valid-reset-token')
    expect(transaction.authSession.updateMany).toHaveBeenCalledWith({
      where: { userId: citizen.id, revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    })
    const passwordChange = transaction.user.update.mock.calls[0]?.[0]
    expect(await argon2.verify(passwordChange.data.passwordHash, 'another secure passphrase')).toBe(true)
  })

  it('preserves root, health, and not-found endpoint behavior', async () => {
    expect((await request(app).get('/')).status).toBe(200)
    expect((await request(app).get('/api/health')).status).toBe(200)
    const missing = await request(app).get('/api/unknown')
    expect(missing.status).toBe(404)
    expect(missing.body.error).toBe('Not found')
  })

  it('rate-limits repeated login attempts', async () => {
    mocks.prisma.user.findUnique.mockResolvedValue(null)

    let finalResponse
    for (let attempt = 0; attempt < 9; attempt += 1) {
      finalResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: 'missing@example.com', password: 'wrong password' })
    }

    expect(finalResponse?.status).toBe(429)
    expect(finalResponse?.body.error).toBe('RATE_LIMITED')
  })
})
