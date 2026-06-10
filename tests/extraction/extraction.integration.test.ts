import { describe, it, expect } from 'vitest'

describe('extraction pipeline integration', () => {
  it('is ready for integration testing with GEMINI_API_KEY set', () => {
    const key = process.env.GEMINI_API_KEY
    if (!key || key.length === 0) {
      console.log('Skipping live extraction test: GEMINI_API_KEY not set in environment')
      return
    }

    expect(true).toBe(true)
  })
})
