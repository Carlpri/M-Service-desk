import { Router } from 'express'
import { z } from 'zod'
import { authenticate, getAuthenticatedUser, requireRole } from '../../middleware/authenticate.js'
import { UserRole } from '../../generated/prisma/enums.js'
import { HttpError } from '../../utils/http-error.js'
import { isCloudinaryConfigured, uploadImageToCloudinary } from '../../utils/cloudinary.js'
import * as serviceRequestsService from './service-requests.service.js'

export const serviceRequestsRouter = Router()
export const adminServiceRequestsRouter = Router()

const uploadImageSchema = z.object({
  image: z.string().min(1, 'Image data is required'),
})

// Check if Cloudinary upload is configured
serviceRequestsRouter.get('/upload-status', (_request, response) => {
  response.status(200).json({
    configured: isCloudinaryConfigured(),
  })
})

// Upload an incident photo directly to Cloudinary
serviceRequestsRouter.post('/upload-image', authenticate, async (request, response) => {
  const parseResult = uploadImageSchema.safeParse(request.body)
  if (!parseResult.success) {
    throw new HttpError(400, 'INVALID_PAYLOAD', 'Valid image data (base64 or URL) is required')
  }

  const result = await uploadImageToCloudinary(parseResult.data.image)
  response.status(200).json({
    message: 'Image uploaded successfully to Cloudinary',
    url: result.url,
    publicId: result.publicId,
  })
})

// Citizen Service Request Endpoints
serviceRequestsRouter.post('/', authenticate, async (request, response) => {
  const user = getAuthenticatedUser(request)
  const result = await serviceRequestsService.createServiceRequest(user.userId, request.body)
  response.status(201).json({
    message: 'Service request submitted successfully',
    request: result,
  })
})

serviceRequestsRouter.get('/', authenticate, async (request, response) => {
  const user = getAuthenticatedUser(request)
  const result = await serviceRequestsService.getCitizenRequests(user.userId, request.query)
  response.status(200).json(result)
})

serviceRequestsRouter.get('/:id', authenticate, async (request, response) => {
  const user = getAuthenticatedUser(request)
  const id = typeof request.params.id === 'string' ? request.params.id : request.params.id?.[0]
  if (!id) {
    response.status(400).json({ error: 'INVALID_REQUEST', message: 'Request ID is required' })
    return
  }
  const result = await serviceRequestsService.getRequestById(id, user)
  response.status(200).json({ request: result })
})

// Administrative Service Request Endpoints
adminServiceRequestsRouter.get('/', authenticate, requireRole(UserRole.ADMIN), async (request, response) => {
  const result = await serviceRequestsService.getAllRequests(request.query)
  response.status(200).json(result)
})

adminServiceRequestsRouter.get('/analytics', authenticate, requireRole(UserRole.ADMIN), async (_request, response) => {
  const result = await serviceRequestsService.getAnalytics()
  response.status(200).json({ analytics: result })
})

adminServiceRequestsRouter.patch('/:id/status', authenticate, requireRole(UserRole.ADMIN), async (request, response) => {
  const id = typeof request.params.id === 'string' ? request.params.id : request.params.id?.[0]
  if (!id) {
    response.status(400).json({ error: 'INVALID_REQUEST', message: 'Request ID is required' })
    return
  }
  const result = await serviceRequestsService.updateRequestStatus(id, request.body)
  response.status(200).json({
    message: 'Service request status updated successfully',
    request: result,
  })
})
