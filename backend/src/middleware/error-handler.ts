import type { ErrorRequestHandler } from 'express'
import { ZodError } from 'zod'
import { HttpError } from '../utils/http-error.js'

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof ZodError) {
    response.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details: error.issues.map(({ path, message }) => ({ path, message })),
    })
    return
  }

  if (error instanceof HttpError) {
    response.status(error.statusCode).json({
      error: error.code,
      message: error.message,
    })
    return
  }

  const statusCode =
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof error.status === 'number' &&
    error.status >= 400 &&
    error.status < 500
      ? error.status
      : 500

  if (statusCode === 500) {
    const errorType = error instanceof Error ? error.name : typeof error
    console.error(`Unhandled request error (${errorType})`)
  }

  response.status(statusCode).json({
    error: statusCode === 500 ? 'INTERNAL_SERVER_ERROR' : 'INVALID_REQUEST',
    message: statusCode === 500 ? 'An unexpected error occurred' : 'The request could not be processed',
  })
}
