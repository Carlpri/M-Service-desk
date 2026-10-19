import { z } from 'zod'
import { RequestStatus } from '../../generated/prisma/enums.js'

export const serviceRequestCategories = [
  'Roads & Infrastructure',
  'Water & Sanitation',
  'Waste Management',
  'Public Health',
  'Street Lighting & Energy',
  'Education & Youth Services',
  'Agriculture & Livestock',
  'Environment & Natural Resources',
  'Other Public Services',
] as const

export const createServiceRequestSchema = z.object({
  category: z.string().trim().min(2, 'Category is required').max(100),
  location: z.string().trim().min(2, 'Location is required').max(150),
  description: z.string().trim().min(10, 'Description must be at least 10 characters').max(2000),
  imageUrl: z
    .string()
    .trim()
    .url('Image URL must be a valid URL')
    .max(2048)
    .optional()
    .or(z.literal('')),
})

export const updateRequestStatusSchema = z.object({
  status: z.enum([RequestStatus.PENDING, RequestStatus.IN_PROGRESS, RequestStatus.RESOLVED]),
  resolutionNote: z.string().trim().max(1000).optional(),
})

export const listRequestsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum([RequestStatus.PENDING, RequestStatus.IN_PROGRESS, RequestStatus.RESOLVED]).optional(),
  category: z.string().trim().optional(),
  search: z.string().trim().optional(),
})

export type CreateServiceRequestInput = z.infer<typeof createServiceRequestSchema>
export type UpdateRequestStatusInput = z.infer<typeof updateRequestStatusSchema>
export type ListRequestsQueryInput = z.infer<typeof listRequestsQuerySchema>
