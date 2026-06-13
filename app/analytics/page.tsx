'use client'

import { useCallback, useEffect, useState, useRef } from 'react'
import { useAuth } from '@/components/providers/auth'
import { TopBar } from '@/components/layout/top-bar'
import { Sidebar } from '@/components/layout/sidebar'
import { fetchTransactions } from '@/lib/api/transactions'

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

function computeAnalyticsFromTransactions(transactions: any[], range: TimeRange): AnalyticsData {
  const now = new Date()
  let startDate: Date
  if (range === '7d') startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  else if (range === '90d') startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
  else if (range === '1y') startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
  else startDate = new Date(0) // all time

  const isWithinRange = (dateStr: string | Date) => {
    if (range === 'all') return true
    const d = new Date(dateStr)
    return d >= startDate
  }

  // Filter approved transactions within range
  const approvedTx = transactions.filter(tx => tx.status === 'approved' && isWithinRange(tx.date))

  // 1. typeSummary
  const typeMap: Record<string, { amount: number; count: number }> = {}
  approvedTx.forEach(tx => {
    const type = tx.transactionType || 'purchase'
    if (!typeMap[type]) typeMap[type] = { amount: 0, count: 0 }
    typeMap[type].amount += tx.amount || 0
    typeMap[type].count += 1
  })
  const typeSummary = Object.entries(typeMap).map(([transactionType, stats]) => ({
    transactionType,
    _sum: { amount: stats.amount },
    _count: { _all: stats.count }
  }))

  // 2. monthlyTrends
  const monthlyMap: Record<string, { total: number; count: number }> = {}
  approvedTx.forEach(tx => {
    const d = new Date(tx.date)
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!monthlyMap[month]) monthlyMap[month] = { total: 0, count: 0 }
    monthlyMap[month].total += tx.amount || 0
    monthlyMap[month].count += 1
  })
  const monthlyTrends = Object.entries(monthlyMap)
    .map(([month, stats]) => ({
      month,
      total: stats.total,
      count: stats.count
    }))
    .sort((a, b) => a.month.localeCompare(b.month))

  // 3. personSummary
  const personMap: Record<string, { amount: number; count: number }> = {}
  approvedTx.forEach(tx => {
    if (!tx.person) return
    const person = tx.person.trim()
    if (!person) return
    if (!personMap[person]) personMap[person] = { amount: 0, count: 0 }
    personMap[person].amount += tx.amount || 0
    personMap[person].count += 1
  })
  const personSummary = Object.entries(personMap)
    .map(([person, stats]) => ({
      person,
      _sum: { amount: stats.amount },
      _count: { _all: stats.count }
    }))
    .sort((a, b) => (b._sum.amount || 0) - (a._sum.amount || 0))
    .slice(0, 10)

  // 4. productSummary
  const productMap: Record<string, { amount: number; count: number }> = {}
  approvedTx.forEach(tx => {
    if (!tx.product) return
    const product = tx.product.trim()
    if (!product) return
    if (!productMap[product]) productMap[product] = { amount: 0, count: 0 }
    productMap[product].amount += tx.amount || 0
    productMap[product].count += 1
  })
  const productSummary = Object.entries(productMap)
    .map(([product, stats]) => ({
      product,
      _sum: { amount: stats.amount },
      _count: { _all: stats.count }
    }))
    .sort((a, b) => (b._sum.amount || 0) - (a._sum.amount || 0))
    .slice(0, 10)

  // 5. approvalMetrics (all time, not range filtered, as per server-side implementation)
  const metricsMap: Record<string, { amount: number; count: number }> = {}
  transactions.forEach(tx => {
    const status = tx.status || 'pending'
    if (!metricsMap[status]) metricsMap[status] = { amount: 0, count: 0 }
    metricsMap[status].amount += tx.amount || 0
    metricsMap[status].count += 1
  })
  const approvalMetrics = Object.entries(metricsMap).map(([status, stats]) => ({
    status,
    _sum: { amount: stats.amount },
    _count: { _all: stats.count }
  }))

  return {
    range,
    startDate: startDate.toISOString(),
    typeSummary,
    monthlyTrends,
    personSummary,
    productSummary,
    approvalMetrics
  }
}

function computeLedgerFromTransactions(transactions: any[], personName: string, range: TimeRange): LedgerData {
  const now = new Date()
  let startDate: Date
  if (range === '7d') startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  else if (range === '30d') startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  else if (range === '90d') startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
  else if (range === '1y') startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
  else startDate = new Date(0) // all time

  const isWithinRange = (dateStr: string | Date) => {
    if (range === 'all') return true
    const d = new Date(dateStr)
    return d >= startDate
  }

  // Filter transactions for this person, sorted chronologically (date asc)
  const personTx = transactions
    .filter(tx => tx.person && tx.person.trim().toLowerCase() === personName.trim().toLowerCase())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  // Calculate full running balance over all time, or over the range?
  // Let's do range filter first because that matches how the server filters transactions before calculating running balance
  const filteredPersonTx = personTx.filter(tx => isWithinRange(tx.date))

  let runningBalance = 0
  const filteredEntries = filteredPersonTx.map((tx) => {
    let credit = 0
    let debit = 0

    if (tx.transactionType === 'purchase') {
      debit = tx.amount
      runningBalance -= tx.amount
    } else if (tx.transactionType === 'payment') {
      credit = tx.amount
      runningBalance += tx.amount
    }

    return {
      id: tx.id,
      date: typeof tx.date === 'string' ? tx.date : tx.date.toISOString(),
      transactionType: tx.transactionType,
      amount: tx.amount,
      product: tx.product || null,
      quantity: tx.quantity || null,
      unit: tx.unit || null,
      notes: tx.notes || null,
      status: tx.status,
      credit,
      debit,
      balance: runningBalance,
      createdBy: tx.createdBy || { id: 'unknown', name: 'Unknown', role: 'me' },
      approvedBy: tx.approvedBy || null,
    }
  })

  const summary = {
    totalPurchases: filteredPersonTx
      .filter((t) => t.transactionType === 'purchase')
      .reduce((sum, t) => sum + t.amount, 0),
    totalPayments: filteredPersonTx
      .filter((t) => t.transactionType === 'payment')
      .reduce((sum, t) => sum + t.amount, 0),
    transactionCount: filteredPersonTx.length,
    finalBalance: runningBalance,
  }

  return {
    person: personName,
    transactions: filteredEntries,
    summary,
  }
}

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
      // 1. Fetch merged transactions (both database and local localStorage)
      const txData = await fetchTransactions()
      const allTx = (txData?.transactions || []) as any[]

      // 2. Extract persons from transactions to ensure we have parties even if API fails or for local transactions
      const localPersons = Array.from(new Set(allTx.map(tx => tx.person?.trim()).filter(Boolean))) as string[]
      const localParties = localPersons.map((name, index) => ({
        id: `local-party-${index}-${name}`,
        name,
        type: 'person'
      }))

      // Try fetching parties from API, merge with extracted ones
      try {
        const partiesRes = await fetch('/api/parties')
        if (partiesRes.ok) {
          const partiesJson = await partiesRes.json()
          const apiParties = partiesJson.parties || []
          
          const mergedPartiesMap = new Map<string, Party>()
          localParties.forEach(p => mergedPartiesMap.set(p.name.toLowerCase(), p))
          apiParties.forEach((p: Party) => mergedPartiesMap.set(p.name.toLowerCase(), p))
          
          setParties(Array.from(mergedPartiesMap.values()).sort((a, b) => a.name.localeCompare(b.name)))
        } else {
          setParties(localParties.sort((a, b) => a.name.localeCompare(b.name)))
        }
      } catch {
        setParties(localParties.sort((a, b) => a.name.localeCompare(b.name)))
      }

      // 3. Try to fetch analytics from API
      let analyticsData: AnalyticsData | null = null
      try {
        const res = await fetch(`/api/analytics?range=${range}`)
        if (res.ok) {
          analyticsData = await res.json()
        }
      } catch (err) {
        // Silently catch and use client-side computation
      }

      // If analytics API failed or returned empty arrays (fallback mode),
      // or if we have local transactions, we should compute or merge them.
      // Computing fully on client-side from the merged transactions list is the safest
      // and most accurate way to reflect local transactions!
      const hasLocalTransactions = allTx.some(tx => tx.id.startsWith('local-'))
      
      if (!analyticsData || analyticsData.typeSummary.length === 0 || hasLocalTransactions) {
        const computed = computeAnalyticsFromTransactions(allTx, range)
        setData(computed)
      } else {
        setData(analyticsData)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load analytics'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [range])

  const loadLedger = useCallback(async (personName: string) => {
    setLedgerLoading(true)
    setLedgerError(null)
    try {
      // 1. Fetch merged transactions
      const txData = await fetchTransactions()
      const allTx = (txData?.transactions || []) as any[]

      // 2. Try fetching ledger from API
      let ledgerJson: LedgerData | null = null
      try {
        const res = await fetch(`/api/parties/${encodeURIComponent(personName)}/ledger?range=${range}`)
        if (res.ok) {
          ledgerJson = await res.json()
        }
      } catch (err) {
        // Silently catch and use client-side computation
      }

      const hasLocalTransactions = allTx.some(tx => tx.id.startsWith('local-'))

      if (!ledgerJson || ledgerJson.transactions.length === 0 || hasLocalTransactions) {
        const computed = computeLedgerFromTransactions(allTx, personName, range)
        setLedgerData(computed)
      } else {
        setLedgerData(ledgerJson)
      }
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
    }
  }, [authLoading, user, loadAnalytics])

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
      <div className="flex min-h-screen flex-col bg-gray-50">
        <TopBar />
        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-6">
          <p className="text-sm text-gray-500">Loading...</p>
        </main>
      </div>
    )
  }

  if (!user) return null

  const totalApproved = data?.typeSummary?.reduce((sum, item) => sum + (item._sum.amount || 0), 0) || 0
  const totalTransactions = data?.typeSummary?.reduce((sum, item) => sum + item._count._all, 0) || 0

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <TopBar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-lg font-semibold">Analytics</h1>
            <p className="text-sm text-zinc-600">Financial insights and reports.</p>
          </div>

          <div className="flex gap-2">
            {RANGES.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setRange(r.value)}
                className={`rounded-lg px-3 py-1.5 text-sm ${
                  range === r.value
                    ? 'bg-emerald-500 text-white'
                    : 'border border-zinc-300 bg-white text-zinc-700'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

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
                <section className="rounded-2xl border border-zinc-200 bg-white p-4">
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

                <section className="rounded-2xl border border-zinc-200 bg-white p-4">
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

                <section className="rounded-2xl border border-zinc-200 bg-white p-4">
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
                          className="flex w-full items-center justify-between rounded-lg px-2 py-1 text-left hover:bg-zinc-100"
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

                <section className="rounded-2xl border border-zinc-200 bg-white p-4">
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
              <section className="rounded-2xl border border-zinc-200 bg-white p-4">
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
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
                    />
                    {selectedPerson && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          {selectedPerson}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPerson(null)
                            setPersonSearch('')
                          }}
                          className="text-xs text-zinc-500 hover:text-zinc-700"
                        >
                          Clear
                        </button>
                      </div>
                    )}
                    {showPersonDropdown && filteredParties.length > 0 && (
                      <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto rounded-md border border-zinc-200 bg-white shadow-lg">
                        {filteredParties.map((party) => (
                          <button
                            key={party.id}
                            type="button"
                            onClick={() => handleSelectPerson(party.name)}
                            className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-zinc-100 ${
                              selectedPerson === party.name ? 'bg-zinc-100 font-medium' : ''
                            }`}
                          >
                            <span>{party.name}</span>
                            <span className="text-xs text-zinc-400">{party.type}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {showPersonDropdown && personSearch && filteredParties.length === 0 && (
                      <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-md border border-zinc-200 bg-white p-3 shadow-lg">
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
                  <p className="text-sm text-red-600">{ledgerError}</p>
                ) : ledgerData ? (
                  <div className="space-y-4">
                    {/* Summary Cards */}
                    <div className="grid gap-3 sm:grid-cols-4">
                      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                        <p className="text-xs text-zinc-500">Total Purchases</p>
                        <p className="mt-1 text-lg font-semibold text-red-600">
                          ₹{ledgerData.summary.totalPurchases.toLocaleString('en-IN')}
                        </p>
                      </div>
                      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                        <p className="text-xs text-zinc-500">Total Payments</p>
                        <p className="mt-1 text-lg font-semibold text-green-600">
                          ₹{ledgerData.summary.totalPayments.toLocaleString('en-IN')}
                        </p>
                      </div>
                      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                        <p className="text-xs text-zinc-500">Transactions</p>
                        <p className="mt-1 text-lg font-semibold">{ledgerData.summary.transactionCount}</p>
                      </div>
                      <div className={`rounded-xl border p-3 ${
                        ledgerData.summary.finalBalance >= 0
                          ? 'border-green-200 bg-green-50'
                          : 'border-red-200 bg-red-50'
                      }`}>
                        <p className="text-xs text-zinc-500">
                          {ledgerData.summary.finalBalance >= 0 ? 'They owe you' : 'You owe them'}
                        </p>
                        <p className={`mt-1 text-lg font-semibold ${
                          ledgerData.summary.finalBalance >= 0
                            ? 'text-green-700'
                            : 'text-red-700'
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
                            <tr className="border-b border-zinc-200 text-left">
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
                              <tr key={entry.id} className="border-b border-zinc-100">
                                <td className="py-2 pr-4 text-zinc-600">
                                  {new Date(entry.date).toLocaleDateString('en-IN', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </td>
                                <td className="py-2 pr-4">
                                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                                    entry.transactionType === 'purchase'
                                      ? 'bg-red-100 text-red-700'
                                      : 'bg-green-100 text-green-700'
                                  }`}>
                                    {entry.transactionType}
                                  </span>
                                </td>
                                <td className="py-2 pr-4 text-zinc-700">
                                  {entry.product ?? '—'}
                                </td>
                                <td className="py-2 pr-4 text-red-600">
                                  {entry.debit > 0 ? `₹${entry.debit.toLocaleString('en-IN')}` : '—'}
                                </td>
                                <td className="py-2 pr-4 text-green-600">
                                  {entry.credit > 0 ? `₹${entry.credit.toLocaleString('en-IN')}` : '—'}
                                </td>
                                <td className={`py-2 pr-4 font-medium ${
                                  entry.balance >= 0
                                    ? 'text-green-700'
                                    : 'text-red-700'
                                }`}>
                                  {entry.balance >= 0 ? '+' : '-'}₹{Math.abs(entry.balance).toLocaleString('en-IN')}
                                </td>
                                <td className="py-2">
                                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs ${
                                    entry.status === 'approved'
                                      ? 'bg-green-100 text-green-700'
                                      : entry.status === 'pending'
                                      ? 'bg-yellow-100 text-yellow-700'
                                      : 'bg-zinc-100 text-zinc-700'
                                  }`}>
                                    {entry.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="border-t-2 border-zinc-300">
                              <td colSpan={3} className="pt-3 font-semibold">Net Balance</td>
                              <td className="pt-3 font-semibold text-red-600">
                                ₹{ledgerData.summary.totalPurchases.toLocaleString('en-IN')}
                              </td>
                              <td className="pt-3 font-semibold text-green-600">
                                ₹{ledgerData.summary.totalPayments.toLocaleString('en-IN')}
                              </td>
                              <td colSpan={2} className={`pt-3 font-bold ${
                                ledgerData.summary.finalBalance >= 0
                                  ? 'text-green-700'
                                  : 'text-red-700'
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
    <div className="rounded-2xl border border-zinc-200 bg-white/90 p-4">
      <p className="text-xs text-zinc-500">{title}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  )
}
