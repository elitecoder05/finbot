export interface RetryOptions {
  maxRetries?: number
  baseDelayMs?: number
  maxDelayMs?: number
  retryableStatuses?: number[]
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelayMs = 500,
    maxDelayMs = 5000,
    retryableStatuses = [429, 500, 502, 503, 504],
  } = options

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (attempt === maxRetries) break

      const status = (error as { status?: number })?.status
      const shouldRetry = retryableStatuses.includes(status)

      if (!shouldRetry) {
        throw lastError
      }

      const delay = Math.min(baseDelayMs * 2 ** attempt, maxDelayMs)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError
}
