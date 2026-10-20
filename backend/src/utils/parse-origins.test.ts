import { describe, expect, it } from 'vitest'
import { parseOrigins } from './parse-origins.js'

describe('parseOrigins utility', () => {
  it('strips trailing slashes from origins', () => {
    const origins = parseOrigins('https://frontend-nu-six-46.vercel.app/, http://localhost:5173/')
    expect(origins).toEqual([
      'https://frontend-nu-six-46.vercel.app',
      'http://localhost:5173',
    ])
  })

  it('handles origins without trailing slashes and trims whitespace', () => {
    const origins = parseOrigins('  https://example.com , http://localhost:3000  ')
    expect(origins).toEqual([
      'https://example.com',
      'http://localhost:3000',
    ])
  })

  it('filters out empty values', () => {
    const origins = parseOrigins('https://example.com,,,')
    expect(origins).toEqual(['https://example.com'])
  })
})
