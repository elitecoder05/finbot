'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/components/providers/auth'
import { fetchTransactions } from '@/lib/api/transactions'
import { TopBar } from '@/components/layout/top-bar'

type TxStatus = 'approved' | 'rejected'

export default function TransactionsPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [transactions, setTransactions] = useState<Array<Record<string, unknown>>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<TxStatus>('approved')

  const loadTransactions = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchTransactions(status)
      setTransactions(data.transactions as Array<Record<string, unknown>>)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load transactions'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [status])

  useEffect(() => {
    if (!authLoading && user) {
      loadTransactions()
    }
  }, [authLoading, user, loadTransactions])

  if (authLoading) {
    return (
      <div className="flex min-h-screen flex-col" style={{ backgroundColor: '#111B21' }}>
        <TopBar />
        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-6">
          <p className="text-sm text-zinc-500">Loading...</p>
        </main>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: '#111B21' }}>
      <TopBar />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-semibold">Approved Transactions</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Finalized transactions after approval.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setStatus('approved')}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              status === 'approved'
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                : 'border border-zinc-300 text-zinc-700 dark:border-zinc-700 dark:text-zinc-300'
            }`}
          >
            Approved
          </button>
          <button
            type="button"
            onClick={() => setStatus('rejected')}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              status === 'rejected'
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                : 'border border-zinc-300 text-zinc-700 dark:border-zinc-700 dark:text-zinc-300'
            }`}
          >
            Rejected
          </button>
        </div>

        {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}

        {loading ? (
          <p className="text-sm text-zinc-500">Loading...</p>
        ) : null}

        {!loading && transactions.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white/60 p-6 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50">
            No {status} transactions found.
          </div>
        ) : null}

        <div className="space-y-3">
          {transactions.map((tx) => {
            const creator = tx.createdBy as Record<string, string>
            const approver = tx.approvedBy as Record<string, string> | null

            return (
              <div
                key={tx.id as string}
                className="rounded-2xl border border-zinc-200 bg-white/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/70"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold capitalize">{(tx.transactionType as string)}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs capitalize ${
                      tx.status === 'approved'
                        ? 'border border-lime-200 bg-lime-50 text-lime-800 dark:border-lime-800 dark:bg-lime-950 dark:text-lime-200'
                        : 'border border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200'
                    }`}
                    >
                      {tx.status as string}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">
                    Amount: <span className="font-medium">₹{Number(tx.amount).toLocaleString('en-IN')}</span>
                  </p>
                  {tx.product ? (
                    <p className="text-sm text-zinc-700 dark:text-zinc-300">Product: {(tx.product as string)}</p>
                  ) : null}
                  {tx.person ? (
                    <p className="text-sm text-zinc-700 dark:text-zinc-300">Person: {(tx.person as string)}</p>
                  ) : null}
                  {tx.notes ? (
                    <p className="text-xs text-zinc-500">Notes: {(tx.notes as string)}</p>
                  ) : null}
                  <p className="text-xs text-zinc-500">
                    Created by {creator?.name ?? '—'} ({creator?.role}) on {new Date(tx.createdAt as string).toLocaleString('en-IN')}
                  </p>
                  {approver ? (
                    <p className="text-xs text-zinc-500">
                      Approved by {approver?.name ?? '—'} ({approver?.role}) on {tx.approvedAt ? new Date(tx.approvedAt as string).toLocaleString('en-IN') : '—'}
                    </p>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
