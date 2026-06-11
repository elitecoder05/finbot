'use client'

import { useCallback, useEffect, useState, useRef } from 'react'
import { useAuth } from '@/components/providers/auth'
import { TopBar } from '@/components/layout/top-bar'
import { Sidebar } from '@/components/layout/sidebar'

type TimeRange = '7d' | '30d' | '90d' | '1y' | 'all'

interface AnalyticsData {
  range: string
  startDate: string
  typeSummary: Array<{ transactionType: string; _sum: { amount: number | null }; _count: { _all: number } }>
  monthlyTrends: Array<{ month: string; total: number; count: number }>
  personSummary: Array<{ person: string; _sum: { amount: number | null }; _count: { _all: number } }>
  productSummary: Array<{ product: string; _sum: { amount: number | null }; _count: { _all: number } }>
  approvalMetrics: Array<{ status: string; _sum: { amount: number | null }; _count: { _all: number } }>
}

interface LedgerEntry {
  id: string
  date: string
  transactionType: string
  amount: number
  product: string | null
  quantity: number | null
  unit: string | null
  notes: string | null
  status: string
  credit: number
  debit: number
  balance: number
  createdBy: { id: string; name: string; role: string }
  approvedBy: { id: string; name: string; role: string } | null
}

interface LedgerData {
  person: string
  transactions: LedgerEntry[]
  summary: {
    totalPurchases: number
    totalPayments: number
    transactionCount: number
    finalBalance: number
  }
}

interface Party {
  id: string
  name: string
  type: string
}

const RANGES: { value: TimeRange; label: string }[] = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: '1y', label: 'Last year' },
  { value: 'all', label: 'All time' },
]

export default function AnalyticsPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [range, setRange] = useState<TimeRange>('30d')

  // Person ledger state
  const [parties, setParties] = useState<Party[]>([])
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null)
  const [ledgerData, setLedgerData] = useState<LedgerData | null>(null)
  const [ledgerLoading, setLedgerLoading] = useState(false)
  const [ledgerError, setLedgerError] = useState<string | null>(null)
  const [personSearch, setPersonSearch] = useState('')
  const [showPersonDropdown, setShowPersonDropdown] = useState(false)
  const personDropdownRef = useRef<HTMLDivElement>(null)

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

  const loadParties = useCallback(async () => {
    try {
      const res = await fetch('/api/parties')
      if (res.ok) {
        const json = await res.json()
        setParties(json.parties || [])
      }
    } catch {
      // silently fail
    }
  }, [])

  const loadLedger = useCallback(async (personName: string) => {
    setLedgerLoading(true)
    setLedgerError(null)
    try {
      const res = await fetch(`/api/parties/${encodeURIComponent(personName)}/ledger?range=${range}`)
      if (!res.ok) throw new Error('Failed to load ledger')
      const json = await res.json()
      setLedgerData(json as LedgerData)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load ledger'
      setLedgerError(message)
    } finally {
      setLedgerLoading(false)
    }
  }, [range])

  useEffect(() => {
    if (!authLoading && user) {
      loadAnalytics()
      loadParties()
    }
  }, [authLoading, user, loadAnalytics, loadParties])

  useEffect(() => {
    if (selectedPerson) {
      loadLedger(selectedPerson)
    } else {
      setLedgerData(null)
    }
  }, [selectedPerson, loadLedger])

  // Close person dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (personDropdownRef.current && !personDropdownRef.current.contains(e.target as Node)) {
        setShowPersonDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelectPerson = (name: string) => {
    setSelectedPerson(name)
    setPersonSearch('')
    setShowPersonDropdown(false)
  }

  const filteredParties = personSearch.trim()
    ? parties.filter((p) => p.name.toLowerCase().includes(personSearch.toLowerCase()))
    : parties

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
                  <h2 className="mb-3 text-sm font-semibold">Top Persons</h2>
                  {data.personSummary.length === 0 ? (
                    <p className="text-sm text-zinc-500">No data for this period.</p>
                  ) : (
                    <div className="space-y-2">
                      {data.personSummary.map((item) => (
                        <button
                          key={item.person}
                          type="button"
                          onClick={() => handleSelectPerson(item.person)}
                          className="flex w-full items-center justify-between rounded-lg px-2 py-1 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        >
                          <span className="text-sm">{item.person}</span>
                          <div className="text-right">
                            <span className="text-sm font-medium">₹{(item._sum.amount || 0).toLocaleString('en-IN')}</span>
                            <span className="ml-2 text-xs text-zinc-500">{item._count._all}</span>
                          </div>
                        </button>
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

              {/* Person Ledger Section */}
              <section className="rounded-2xl border border-zinc-200 bg-white/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/70">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="text-sm font-semibold">Person Ledger</h2>
                  <div className="relative w-full sm:w-72" ref={personDropdownRef}>
                    <input
                      type="text"
                      value={personSearch}
                      onChange={(e) => {
                        setPersonSearch(e.target.value)
                        setShowPersonDropdown(true)
                      }}
                      onFocus={() => setShowPersonDropdown(true)}
                      placeholder="Search or select a person..."
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                    />
                    {selectedPerson && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-xs text-white dark:bg-zinc-100 dark:text-zinc-900">
                          {selectedPerson}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPerson(null)
                            setPersonSearch('')
                          }}
                          className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                        >
                          Clear
                        </button>
                      </div>
                    )}
                    {showPersonDropdown && filteredParties.length > 0 && (
                      <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto rounded-md border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                        {filteredParties.map((party) => (
                          <button
                            key={party.id}
                            type="button"
                            onClick={() => handleSelectPerson(party.name)}
                            className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                              selectedPerson === party.name ? 'bg-zinc-100 dark:bg-zinc-800 font-medium' : ''
                            }`}
                          >
                            <span>{party.name}</span>
                            <span className="text-xs text-zinc-400">{party.type}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {showPersonDropdown && personSearch && filteredParties.length === 0 && (
                      <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-md border border-zinc-200 bg-white p-3 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                        <p className="text-xs text-zinc-500">No person found matching &quot;{personSearch}&quot;</p>
                        <p className="mt-1 text-xs text-zinc-400">Add them from the chat when saving a transaction.</p>
                      </div>
                    )}
                  </div>
                </div>

                {!selectedPerson ? (
                  <p className="text-sm text-zinc-500">Select a person above to view their complete ledger.</p>
                ) : ledgerLoading ? (
                  <p className="text-sm text-zinc-500">Loading ledger...</p>
                ) : ledgerError ? (
                  <p className="text-sm text-red-600 dark:text-red-400">{ledgerError}</p>
                ) : ledgerData ? (
                  <div className="space-y-4">
                    {/* Summary Cards */}
                    <div className="grid gap-3 sm:grid-cols-4">
                      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800">
                        <p className="text-xs text-zinc-500">Total Purchases</p>
                        <p className="mt-1 text-lg font-semibold text-red-600 dark:text-red-400">
                          ₹{ledgerData.summary.totalPurchases.toLocaleString('en-IN')}
                        </p>
                      </div>
                      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800">
                        <p className="text-xs text-zinc-500">Total Payments</p>
                        <p className="mt-1 text-lg font-semibold text-green-600 dark:text-green-400">
                          ₹{ledgerData.summary.totalPayments.toLocaleString('en-IN')}
                        </p>
                      </div>
                      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800">
                        <p className="text-xs text-zinc-500">Transactions</p>
                        <p className="mt-1 text-lg font-semibold">{ledgerData.summary.transactionCount}</p>
                      </div>
                      <div className={`rounded-xl border p-3 ${
                        ledgerData.summary.finalBalance >= 0
                          ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950'
                          : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950'
                      }`}>
                        <p className="text-xs text-zinc-500">
                          {ledgerData.summary.finalBalance >= 0 ? 'They owe you' : 'You owe them'}
                        </p>
                        <p className={`mt-1 text-lg font-semibold ${
                          ledgerData.summary.finalBalance >= 0
                            ? 'text-green-700 dark:text-green-300'
                            : 'text-red-700 dark:text-red-300'
                        }`}>
                          ₹{Math.abs(ledgerData.summary.finalBalance).toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>

                    {/* Ledger Table */}
                    {ledgerData.transactions.length === 0 ? (
                      <p className="text-sm text-zinc-500">No transactions found for this person in the selected period.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-zinc-200 text-left dark:border-zinc-700">
                              <th className="pb-2 pr-4 font-medium text-zinc-500">Date</th>
                              <th className="pb-2 pr-4 font-medium text-zinc-500">Type</th>
                              <th className="pb-2 pr-4 font-medium text-zinc-500">Product</th>
                              <th className="pb-2 pr-4 font-medium text-zinc-500">Debit</th>
                              <th className="pb-2 pr-4 font-medium text-zinc-500">Credit</th>
                              <th className="pb-2 pr-4 font-medium text-zinc-500">Balance</th>
                              <th className="pb-2 font-medium text-zinc-500">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ledgerData.transactions.map((entry) => (
                              <tr key={entry.id} className="border-b border-zinc-100 dark:border-zinc-800">
                                <td className="py-2 pr-4 text-zinc-600 dark:text-zinc-400">
                                  {new Date(entry.date).toLocaleDateString('en-IN', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </td>
                                <td className="py-2 pr-4">
                                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                                    entry.transactionType === 'purchase'
                                      ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                                      : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                                  }`}>
                                    {entry.transactionType}
                                  </span>
                                </td>
                                <td className="py-2 pr-4 text-zinc-700 dark:text-zinc-300">
                                  {entry.product ?? '—'}
                                </td>
                                <td className="py-2 pr-4 text-red-600 dark:text-red-400">
                                  {entry.debit > 0 ? `₹${entry.debit.toLocaleString('en-IN')}` : '—'}
                                </td>
                                <td className="py-2 pr-4 text-green-600 dark:text-green-400">
                                  {entry.credit > 0 ? `₹${entry.credit.toLocaleString('en-IN')}` : '—'}
                                </td>
                                <td className={`py-2 pr-4 font-medium ${
                                  entry.balance >= 0
                                    ? 'text-green-700 dark:text-green-300'
                                    : 'text-red-700 dark:text-red-300'
                                }`}>
                                  {entry.balance >= 0 ? '+' : '-'}₹{Math.abs(entry.balance).toLocaleString('en-IN')}
                                </td>
                                <td className="py-2">
                                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs ${
                                    entry.status === 'approved'
                                      ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                                      : entry.status === 'pending'
                                      ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                                      : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                                  }`}>
                                    {entry.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="border-t-2 border-zinc-300 dark:border-zinc-600">
                              <td colSpan={3} className="pt-3 font-semibold">Net Balance</td>
                              <td className="pt-3 font-semibold text-red-600 dark:text-red-400">
                                ₹{ledgerData.summary.totalPurchases.toLocaleString('en-IN')}
                              </td>
                              <td className="pt-3 font-semibold text-green-600 dark:text-green-400">
                                ₹{ledgerData.summary.totalPayments.toLocaleString('en-IN')}
                              </td>
                              <td colSpan={2} className={`pt-3 font-bold ${
                                ledgerData.summary.finalBalance >= 0
                                  ? 'text-green-700 dark:text-green-300'
                                  : 'text-red-700 dark:text-red-300'
                              }`}>
                                {ledgerData.summary.finalBalance >= 0 ? '+' : '-'}₹{Math.abs(ledgerData.summary.finalBalance).toLocaleString('en-IN')}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>
                ) : null}
              </section>
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
