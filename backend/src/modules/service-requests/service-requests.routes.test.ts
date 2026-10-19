import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'

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
    serviceRequest: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      groupBy: vi.fn(),
    },
    $transaction: vi.fn(),
    $queryRaw: vi.fn(),
  },
}))

vi.mock('../../config/prisma.js', () => ({ prisma: mocks.prisma }))
vi.mock('../auth/email-delivery.js', () => ({ emailDelivery: null }))

import app from '../../app.js'

const validCitizenToken = 'a'.repeat(43)
const validAdminToken = 'b'.repeat(43)

const mockCitizen = {
  id: 'citizen-123',
  name: 'Amina Citizen',
  email: 'amina@example.com',
  role: 'CITIZEN',
}

const mockAdmin = {
  id: 'admin-456',
  name: 'Hon. Administrator',
  email: 'admin@muranga.go.ke',
  role: 'ADMIN',
}

const sampleRequest = {
  id: 'req-001',
  referenceNumber: 'MSD-20261017-ABCDE',
  citizenId: mockCitizen.id,
  citizen: {
    id: mockCitizen.id,
    name: mockCitizen.name,
    email: mockCitizen.email,
  },
  category: 'Roads & Infrastructure',
  location: 'Murang\'a Town, Kiharu Ward',
  description: 'Potholes along the main bypass need resurfacing.',
  imageUrl: 'https://example.com/pothole.jpg',
  status: 'PENDING',
  resolutionNote: null,
  createdAt: new Date('2026-10-17T10:00:00.000Z'),
  updatedAt: new Date('2026-10-17T10:00:00.000Z'),
}

function mockCitizenAuth() {
  mocks.prisma.authSession.findFirst.mockResolvedValue({
    id: 'session-citizen',
    userId: mockCitizen.id,
    user: { role: 'CITIZEN' },
  })
}

function mockAdminAuth() {
  mocks.prisma.authSession.findFirst.mockResolvedValue({
    id: 'session-admin',
    userId: mockAdmin.id,
    user: { role: 'ADMIN' },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.prisma.$queryRaw.mockResolvedValue([])
  mocks.prisma.$transaction.mockResolvedValue([])
})

describe('service requests routes', () => {
  describe('citizen service request submission', () => {
    it('creates a service request with status PENDING and a unique reference number', async () => {
      mockCitizenAuth()
      mocks.prisma.serviceRequest.create.mockResolvedValue(sampleRequest)

      const response = await request(app)
        .post('/api/service-requests')
        .set('Authorization', `Bearer ${validCitizenToken}`)
        .send({
          category: 'Roads & Infrastructure',
          location: 'Murang\'a Town, Kiharu Ward',
          description: 'Potholes along the main bypass need resurfacing.',
          imageUrl: 'https://example.com/pothole.jpg',
        })

      expect(response.status).toBe(201)
      expect(response.body.message).toBe('Service request submitted successfully')
      expect(response.body.request.status).toBe('PENDING')
      expect(response.body.request.referenceNumber).toBe(sampleRequest.referenceNumber)
      expect(mocks.prisma.serviceRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            citizenId: mockCitizen.id,
            category: 'Roads & Infrastructure',
            location: 'Murang\'a Town, Kiharu Ward',
            status: 'PENDING',
          }),
        }),
      )
    })

    it('rejects unauthenticated request submission', async () => {
      const response = await request(app)
        .post('/api/service-requests')
        .send({
          category: 'Roads & Infrastructure',
          location: 'Murang\'a Town',
          description: 'Potholes along the main bypass need resurfacing.',
        })

      expect(response.status).toBe(401)
      expect(response.body.error).toBe('AUTHENTICATION_REQUIRED')
      expect(mocks.prisma.serviceRequest.create).not.toHaveBeenCalled()
    })

    it('validates input and rejects descriptions shorter than 10 characters', async () => {
      mockCitizenAuth()

      const response = await request(app)
        .post('/api/service-requests')
        .set('Authorization', `Bearer ${validCitizenToken}`)
        .send({
          category: 'Roads & Infrastructure',
          location: 'Murang\'a Town',
          description: 'Too short',
        })

      expect(response.status).toBe(400)
      expect(response.body.error).toBe('VALIDATION_ERROR')
      expect(mocks.prisma.serviceRequest.create).not.toHaveBeenCalled()
    })
  })

  describe('citizen viewing and tracking requests', () => {
    it('allows a citizen to list their own requests', async () => {
      mockCitizenAuth()
      mocks.prisma.$transaction.mockResolvedValue([[sampleRequest], 1])

      const response = await request(app)
        .get('/api/service-requests')
        .set('Authorization', `Bearer ${validCitizenToken}`)

      expect(response.status).toBe(200)
      expect(response.body.requests).toHaveLength(1)
      expect(response.body.total).toBe(1)
      expect(response.body.requests[0].referenceNumber).toBe(sampleRequest.referenceNumber)
    })

    it('allows a citizen to view their specific request details', async () => {
      mockCitizenAuth()
      mocks.prisma.serviceRequest.findUnique.mockResolvedValue(sampleRequest)

      const response = await request(app)
        .get(`/api/service-requests/${sampleRequest.id}`)
        .set('Authorization', `Bearer ${validCitizenToken}`)

      expect(response.status).toBe(200)
      expect(response.body.request.id).toBe(sampleRequest.id)
    })

    it('forbids a citizen from viewing another citizen\'s service request', async () => {
      mockCitizenAuth()
      mocks.prisma.serviceRequest.findUnique.mockResolvedValue({
        ...sampleRequest,
        citizenId: 'another-citizen-999',
      })

      const response = await request(app)
        .get(`/api/service-requests/${sampleRequest.id}`)
        .set('Authorization', `Bearer ${validCitizenToken}`)

      expect(response.status).toBe(403)
      expect(response.body.error).toBe('FORBIDDEN')
    })

    it('returns 404 when request is not found', async () => {
      mockCitizenAuth()
      mocks.prisma.serviceRequest.findUnique.mockResolvedValue(null)

      const response = await request(app)
        .get('/api/service-requests/non-existent-id')
        .set('Authorization', `Bearer ${validCitizenToken}`)

      expect(response.status).toBe(404)
      expect(response.body.error).toBe('REQUEST_NOT_FOUND')
    })
  })

  describe('administrative service request operations', () => {
    it('allows an administrator to list all requests across citizens', async () => {
      mockAdminAuth()
      mocks.prisma.$transaction.mockResolvedValue([[sampleRequest], 1])

      const response = await request(app)
        .get('/api/admin/service-requests')
        .set('Authorization', `Bearer ${validAdminToken}`)

      expect(response.status).toBe(200)
      expect(response.body.requests).toHaveLength(1)
      expect(response.body.total).toBe(1)
    })

    it('blocks a citizen from listing all requests via admin endpoint', async () => {
      mockCitizenAuth()

      const response = await request(app)
        .get('/api/admin/service-requests')
        .set('Authorization', `Bearer ${validCitizenToken}`)

      expect(response.status).toBe(403)
      expect(response.body.error).toBe('FORBIDDEN')
    })

    it('allows an administrator to update request status and add a resolution note', async () => {
      mockAdminAuth()
      mocks.prisma.serviceRequest.findUnique.mockResolvedValue(sampleRequest)
      const updated = {
        ...sampleRequest,
        status: 'RESOLVED',
        resolutionNote: 'County engineers inspected and repaired the road surface.',
      }
      mocks.prisma.serviceRequest.update.mockResolvedValue(updated)

      const response = await request(app)
        .patch(`/api/admin/service-requests/${sampleRequest.id}/status`)
        .set('Authorization', `Bearer ${validAdminToken}`)
        .send({
          status: 'RESOLVED',
          resolutionNote: 'County engineers inspected and repaired the road surface.',
        })

      expect(response.status).toBe(200)
      expect(response.body.message).toBe('Service request status updated successfully')
      expect(response.body.request.status).toBe('RESOLVED')
      expect(response.body.request.resolutionNote).toBe('County engineers inspected and repaired the road surface.')
      expect(mocks.prisma.serviceRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: sampleRequest.id },
          data: {
            status: 'RESOLVED',
            resolutionNote: 'County engineers inspected and repaired the road surface.',
          },
        }),
      )
    })

    it('blocks a citizen from updating request status', async () => {
      mockCitizenAuth()

      const response = await request(app)
        .patch(`/api/admin/service-requests/${sampleRequest.id}/status`)
        .set('Authorization', `Bearer ${validCitizenToken}`)
        .send({
          status: 'RESOLVED',
        })

      expect(response.status).toBe(403)
      expect(response.body.error).toBe('FORBIDDEN')
      expect(mocks.prisma.serviceRequest.update).not.toHaveBeenCalled()
    })

    it('allows an administrator to access analytics metrics', async () => {
      mockAdminAuth()
      mocks.prisma.$transaction.mockResolvedValue([
        10, // total
        4,  // pending
        3,  // inProgress
        3,  // resolved
        [
          { category: 'Roads & Infrastructure', _count: { id: 6 } },
          { category: 'Water & Sanitation', _count: { id: 4 } },
        ],
      ])

      const response = await request(app)
        .get('/api/admin/service-requests/analytics')
        .set('Authorization', `Bearer ${validAdminToken}`)

      expect(response.status).toBe(200)
      expect(response.body.analytics).toEqual({
        total: 10,
        pending: 4,
        inProgress: 3,
        resolved: 3,
        byCategory: [
          { category: 'Roads & Infrastructure', count: 6 },
          { category: 'Water & Sanitation', count: 4 },
        ],
      })
    })

    it('blocks a citizen from accessing admin analytics', async () => {
      mockCitizenAuth()

      const response = await request(app)
        .get('/api/admin/service-requests/analytics')
        .set('Authorization', `Bearer ${validCitizenToken}`)

      expect(response.status).toBe(403)
      expect(response.body.error).toBe('FORBIDDEN')
    })
  })
})
