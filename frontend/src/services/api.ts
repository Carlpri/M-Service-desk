import type { ApiHealthResponse } from '../types/api'

const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export async function getApiHealth(): Promise<ApiHealthResponse> {
  const response = await fetch(`${apiBaseUrl}/api/health`)

  if (!response.ok) {
    throw new Error(`Health check failed with status ${response.status}`)
  }

  return (await response.json()) as ApiHealthResponse
}
