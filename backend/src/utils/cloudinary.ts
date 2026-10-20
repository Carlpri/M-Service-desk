import { v2 as cloudinary } from 'cloudinary'
import { env } from '../config/env.js'
import { HttpError } from './http-error.js'

if (env.CLOUDINARY_URL) {
  cloudinary.config({
    cloudinary_url: env.CLOUDINARY_URL,
    secure: true,
  })
} else if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  })
}

export function isCloudinaryConfigured(): boolean {
  return env.cloudinaryConfigured
}

export async function uploadImageToCloudinary(
  fileDataOrUrl: string,
  folder = 'm-service-desk/requests',
): Promise<{ url: string; publicId: string; format?: string; width?: number; height?: number }> {
  if (!env.cloudinaryConfigured) {
    throw new HttpError(
      503,
      'CLOUDINARY_NOT_CONFIGURED',
      'Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET (or CLOUDINARY_URL) in backend environment variables.',
    )
  }

  try {
    const result = await cloudinary.uploader.upload(fileDataOrUrl, {
      folder,
      resource_type: 'image',
      transformation: [
        { quality: 'auto:good' },
        { fetch_format: 'auto' },
      ],
    })

    return {
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      width: result.width,
      height: result.height,
    }
  } catch (error: unknown) {
    console.error('Cloudinary upload error:', error)
    const message = error instanceof Error ? error.message : 'Cloudinary image upload failed'
    throw new HttpError(502, 'IMAGE_UPLOAD_FAILED', message)
  }
}
