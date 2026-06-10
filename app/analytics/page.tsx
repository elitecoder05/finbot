'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/components/providers/auth'
import { TopBar } from '@/components/layout/top-bar'
import { Sidebar } from '@/components/layout/sidebar'

type TimeRange = '7d' | '30d' | '90d' | '1y'

interface AnalyticsData {
  range: string
  startDate: string
  typeSummary: Array<{ transactionType: string; _sum: { amount: number | null }; _count: { _all: number } }>
  monthlyTrends: Array<{ month: string; total: number; count: number }>
  vendorSummary: Array<{ vendor: string; _sum: { amount: number | null }; _count: { _all: number } }>
  productSummary: Array<{ product: string; _sum: { amount: number | null }; _count: { _all: number } }>
  approvalMetrics: Array<{ status: string; _sum: { amount: number | null }; _count: { _all: number } }>
}

const RANGES: { value: TimeRange; label: string }[] = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: '1y', label: 'Last year' },
]

export default function AnalyticsPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [range, setRange] = useState<TimeRange>('30d')

  const loadAnalytics = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/analytics?range=${range}`)
      if (!res.ok) throw new Error('Failed to load analytics')
      const json = await res.json()
      setData(json as AnalyticsData)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load analytics'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [range])

  useEffect(() => {
    if (!authLoading && user) {
      loadAnalytics()
    }
  }, [authLoading, user, loadAnalytics])

  if (authLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <TopBar />
        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-6">
          <p className="text-sm text-zinc-500">Loading...</p>
        </main>
      </div>
    )
  }

  if (!user) return null

  const totalApproved = data?.typeSummary?.reduce((sum, item) => sum + (item._sum.amount || 0), 0) || 0
  const totalTransactions = data?.typeSummary?.reduce((sum, item) => sum + item._count._all, 0) || 0

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-lg font-semibold">Analytics</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Financial insights and reports.</p>
          </div>

          <div className="flex gap-2">
            {RANGES.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setRange(r.value)}
                className={`rounded-lg px-3 py-1.5 text-sm ${
                  range === r.value
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                    : 'border border-zinc-300 text-zinc-700 dark:border-zinc-700 dark:text-zinc-300'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}

          {loading ? (
            <p className="text-sm text-zinc-500">Loading analytics...</p>
          ) : null}

          {!loading && data ? (
            <>
              <div className="grid gap-4 md:grid-cols-4">
                <StatCard title="Total Volume" value={`₹${totalApproved.toLocaleString('en-IN')}`} />
                <StatCard title="Transactions" value={totalTransactions.toString()} />
                <StatCard title="Approved" value={(data.approvalMetrics.find((m) => m.status === 'approved')?._count._all || 0).toString()} />
                <StatCard title="Rejected" value={(data.approvalMetrics.find((m) => m.status === 'rejected')?._count._all || 0).toString()} />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <section className="rounded-2xl border border-zinc-200 bg-white/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/70">
                  <h2 className="mb-3 text-sm font-semibold">Transaction Types</h2>
                  {data.typeSummary.length === 0 ? (
                    <p className="text-sm text-zinc-500">No data for this period.</p>
                  ) : (
                    <div className="space-y-2">
                      {data.typeSummary.map((item) => (
                        <div key={item.transactionType} className="flex items-center justify-between">
                          <span className="text-sm capitalize">{item.transactionType}</span>
                          <div className="text-right">
                            <span className="text-sm font-medium">₹{(item._sum.amount || 0).toLocaleString('en-IN')}</span>
                            <span className="ml-2 text-xs text-zinc-500">{item._count._all}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="rounded-2xl border border-zinc-200 bg-white/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/70">
                  <h2 className="mb-3 text-sm font-semibold">Monthly Trends</h2>
                  {data.monthlyTrends.length === 0 ? (
                    <p className="text-sm text-zinc-500">No data for this period.</p>
                  ) : (
                    <div className="space-y-2">
                      {data.monthlyTrends.map((item) => (
                        <div key={item.month} className="flex items-center justify-between">
                          <span className="text-sm">{item.month}</span>
                          <div className="text-right">
                            <span className="text-sm font-medium">₹{item.total.toLocaleString('en-IN')}</span>
                            <span className="ml-2 text-xs text-zinc-500">{item.count} txns</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="rounded-2xl border border-zinc-200 bg-white/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/70">
                  <h2 className="mb-3 text-sm font-semibold">Top Vendors</h2>
                  {data.vendorSummary.length === 0 ? (
                    <p className="text-sm text-zinc-500">No data for this period.</p>
                  ) : (
                    <div className="space-y-2">
                      {data.vendorSummary.map((item) => (
                        <div key={item.vendor} className="flex items-center justify-between">
                          <span className="text-sm">{item.vendor}</span>
                          <div className="text-right">
                            <span className="text-sm font-medium">₹{(item._sum.amount || 0).toLocaleString('en-IN')}</span>
                            <span className="ml-2 text-xs text-zinc-500">{item._count._all}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="rounded-2xl border border-zinc-200 bg-white/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/70">
                  <h2 className="mb-3 text-sm font-semibold">Top Products</h2>
                  {data.productSummary.length === 0 ? (
                    <p className="text-sm text-zinc-500">No data for this period.</p>
                  ) : (
                    <div className="space-y-2">
                      {data.productSummary.map((item) => (
                        <div key={item.product} className="flex items-center justify-between">
                          <span className="text-sm">{item.product}</span>
                          <div className="text-right">
                            <span className="text-sm font-medium">₹{(item._sum.amount || 0).toLocaleString('en-IN')}</span>
                            <span className="ml-2 text-xs text-zinc-500">{item._count._all}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </>
          ) : null}
        </main>
      </div>
    </div>
  )
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/70">
      <p className="text-xs text-zinc-500">{title}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  )
}
