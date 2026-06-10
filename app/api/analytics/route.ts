import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { requireSession } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    await requireSession()
    const { searchParams } = new URL(request.url)
    const range = searchParams.get('range') || '30d'

    const now = new Date()
    let startDate: Date
    if (range === '7d') startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    else if (range === '90d') startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    else if (range === '1y') startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
    else startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const [typeSummary, monthlyTrends, vendorSummary, productSummary, approvalMetrics] = await Promise.all([
      prisma.transaction.groupBy({
        by: ['transactionType'],
        where: { status: 'approved', date: { gte: startDate } },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.$queryRaw<{ month: string; total: number; count: number }[]>`
        SELECT strftime('%Y-%m', date) as month, SUM(amount) as total, COUNT(*) as count
        FROM Transaction
        WHERE status = 'approved' AND date >= ${startDate.toISOString()}
        GROUP BY strftime('%Y-%m', date)
        ORDER BY month ASC
      `,
      prisma.transaction.groupBy({
        by: ['vendor'],
        where: { status: 'approved', date: { gte: startDate }, vendor: { not: '' } },
        _sum: { amount: true },
        _count: { _all: true },
        orderBy: { _sum: { amount: 'desc' } },
        take: 10,
      }),
      prisma.transaction.groupBy({
        by: ['product'],
        where: { status: 'approved', date: { gte: startDate }, product: { not: '' } },
        _sum: { amount: true },
        _count: { _all: true },
        orderBy: { _sum: { amount: 'desc' } },
        take: 10,
      }),
      prisma.transaction.groupBy({
        by: ['status'],
        _count: { _all: true },
        _sum: { amount: true },
      }),
    ])

    return NextResponse.json({
      range,
      startDate: startDate.toISOString(),
      typeSummary,
      monthlyTrends,
      vendorSummary,
      productSummary,
      approvalMetrics,
    })
  } catch (error) {
    console.error('/api/analytics error:', error)
    return NextResponse.json({ error: 'Failed to load analytics' }, { status: 500 })
  }
}
