import { randomBytes } from 'node:crypto'
import { prisma } from '../../config/prisma.js'
import { RequestStatus, UserRole } from '../../generated/prisma/enums.js'
import { HttpError } from '../../utils/http-error.js'
import {
  createServiceRequestSchema,
  listRequestsQuerySchema,
  updateRequestStatusSchema,
} from './service-requests.schemas.js'
import type {
  ServiceRequestAnalytics,
  ServiceRequestRecord,
} from './service-requests.types.js'

export function generateReferenceNumber(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const randomSuffix = randomBytes(3).toString('hex').toUpperCase().slice(0, 5)
  return `MSD-${dateStr}-${randomSuffix}`
}

export async function createServiceRequest(
  citizenId: string,
  input: unknown,
): Promise<ServiceRequestRecord> {
  const data = createServiceRequestSchema.parse(input)

  let referenceNumber = generateReferenceNumber()
  let attempts = 0
  const maxAttempts = 5

  while (attempts < maxAttempts) {
    try {
      const created = await prisma.serviceRequest.create({
        data: {
          referenceNumber,
          citizenId,
          category: data.category,
          location: data.location,
          description: data.description,
          imageUrl: data.imageUrl || null,
          status: RequestStatus.PENDING,
        },
        include: {
          citizen: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      })
      return created
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        attempts++
        referenceNumber = generateReferenceNumber()
        continue
      }
      throw error
    }
  }

  throw new HttpError(500, 'REFERENCE_GENERATION_FAILED', 'Could not generate a unique reference number')
}

export async function getCitizenRequests(
  citizenId: string,
  queryInput: unknown,
): Promise<{ requests: ServiceRequestRecord[]; page: number; pageSize: number; total: number }> {
  const { page, pageSize, status, category, search } = listRequestsQuerySchema.parse(queryInput)

  const whereClause: {
    citizenId: string
    status?: RequestStatus
    category?: string
    OR?: Array<{ [key: string]: { contains: string; mode: 'insensitive' } }>
  } = {
    citizenId,
  }

  if (status) {
    whereClause.status = status
  }

  if (category) {
    whereClause.category = category
  }

  if (search) {
    whereClause.OR = [
      { referenceNumber: { contains: search, mode: 'insensitive' } },
      { location: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ]
  }

  const [requests, total] = await prisma.$transaction([
    prisma.serviceRequest.findMany({
      where: whereClause,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        citizen: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),
    prisma.serviceRequest.count({ where: whereClause }),
  ])

  return { requests, page, pageSize, total }
}

export async function getRequestById(
  requestId: string,
  user: { userId: string; role: UserRole },
): Promise<ServiceRequestRecord> {
  const request = await prisma.serviceRequest.findUnique({
    where: { id: requestId },
    include: {
      citizen: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  })

  if (!request) {
    throw new HttpError(404, 'REQUEST_NOT_FOUND', 'Service request not found')
  }

  if (user.role !== UserRole.ADMIN && request.citizenId !== user.userId) {
    throw new HttpError(403, 'FORBIDDEN', 'You are not authorized to view this service request')
  }

  return request
}

export async function getAllRequests(
  queryInput: unknown,
): Promise<{ requests: ServiceRequestRecord[]; page: number; pageSize: number; total: number }> {
  const { page, pageSize, status, category, search } = listRequestsQuerySchema.parse(queryInput)

  const whereClause: {
    status?: RequestStatus
    category?: string
    OR?: Array<{ [key: string]: { contains: string; mode: 'insensitive' } }>
  } = {}

  if (status) {
    whereClause.status = status
  }

  if (category) {
    whereClause.category = category
  }

  if (search) {
    whereClause.OR = [
      { referenceNumber: { contains: search, mode: 'insensitive' } },
      { location: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ]
  }

  const [requests, total] = await prisma.$transaction([
    prisma.serviceRequest.findMany({
      where: whereClause,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        citizen: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),
    prisma.serviceRequest.count({ where: whereClause }),
  ])

  return { requests, page, pageSize, total }
}

export async function updateRequestStatus(
  requestId: string,
  input: unknown,
): Promise<ServiceRequestRecord> {
  const data = updateRequestStatusSchema.parse(input)

  const existing = await prisma.serviceRequest.findUnique({
    where: { id: requestId },
  })

  if (!existing) {
    throw new HttpError(404, 'REQUEST_NOT_FOUND', 'Service request not found')
  }

  const updated = await prisma.serviceRequest.update({
    where: { id: requestId },
    data: {
      status: data.status,
      resolutionNote: data.resolutionNote !== undefined ? data.resolutionNote : existing.resolutionNote,
    },
    include: {
      citizen: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  })

  return updated
}

export async function getAnalytics(): Promise<ServiceRequestAnalytics> {
  const [total, pending, inProgress, resolved, categories] = await prisma.$transaction([
    prisma.serviceRequest.count(),
    prisma.serviceRequest.count({ where: { status: RequestStatus.PENDING } }),
    prisma.serviceRequest.count({ where: { status: RequestStatus.IN_PROGRESS } }),
    prisma.serviceRequest.count({ where: { status: RequestStatus.RESOLVED } }),
    prisma.serviceRequest.groupBy({
      by: ['category'],
      _count: { _all: true },
      orderBy: { category: 'asc' },
    }),
  ])

  return {
    total,
    pending,
    inProgress,
    resolved,
    byCategory: categories.map((item) => {
      const count =
        typeof item._count === 'object' && item._count !== null
          ? (item._count as { _all?: number; id?: number })._all ?? (item._count as { id?: number }).id ?? 0
          : 0
      return {
        category: item.category,
        count,
      }
    }),
  }
}
