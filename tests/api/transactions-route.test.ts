import { beforeEach, describe, expect, it, vi } from 'vitest'

const findManyMock = vi.fn()

vi.mock('@/lib/db/client', () => ({
  prisma: {
    transaction: {
      findMany: findManyMock,
    },
  },
}))

const requireSessionMock = vi.fn()

vi.mock('@/lib/auth', () => ({
  requireSession: requireSessionMock,
}))

describe('transactions API fallback behavior', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    findManyMock.mockReset()
    requireSessionMock.mockResolvedValue({
      userId: 'user-1',
      username: 'father',
      role: 'father',
      name: 'Father',
    })
  })

  it('falls back to an empty transactions list when the database is unavailable', async () => {
    findManyMock.mockRejectedValue(new Error('database unavailable'))

    const { GET } = await import('@/app/api/transactions/route')
    const response = await GET(new Request('http://localhost/api/transactions?status=pending'))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ transactions: [] })
  })
})
