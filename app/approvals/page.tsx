'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/components/providers/auth'
import { getApprovalPermissionRules, isApprovalAllowed } from '@/lib/rbac'
import { approveTransaction, fetchTransactions } from '@/lib/api/transactions'
import { TopBar } from '@/components/layout/top-bar'

type ApprovalStatus = 'pending' | 'approved' | 'rejected'

export default function ApprovalsPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [transactions, setTransactions] = useState<Array<Record<string, unknown>>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [commentMap, setCommentMap] = useState<Record<string, string>>({})

  const loadTransactions = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchTransactions('pending')
      let list = data.transactions as Array<Record<string, unknown>>

      if (user?.role) {
        list = list.filter((tx) => {
          const creatorRole = (tx.createdBy as Record<string, string>)?.role
          return isApprovalAllowed(creatorRole, user.role)
        })
      }

      setTransactions(list)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load approvals'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [user?.role])

  useEffect(() => {
    if (!authLoading && user) {
      loadTransactions()
    }
  }, [authLoading, user, loadTransactions])

  const handleAction = useCallback(
    async (transactionId: string, action: 'approve' | 'reject') => {
      setProcessingId(transactionId)
      try {
        await approveTransaction(transactionId, action, commentMap[transactionId] || undefined)
        setTransactions((prev) => prev.filter((tx) => tx.id !== transactionId))
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to process approval'
        setError(message)
      } finally {
        setProcessingId(null)
      }
    },
    [commentMap]
  )

  const handleCommentChange = useCallback((transactionId: string, value: string) => {
    setCommentMap((prev) => ({ ...prev, [transactionId]: value }))
  }, [])

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

  const allowedApprovers = getApprovalPermissionRules(user.role)
  const hasApprovalAccess = allowedApprovers.length > 0

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <TopBar />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-semibold">Pending Approvals</h1>
          <p className="text-sm text-zinc-600">
            Transactions awaiting your approval.{' '}
            <span className="font-medium">
              Allowed approvers for your transactions:{' '}
              {allowedApprovers.map((r) => r.replace('me', 'Me').replace('father', 'Father').replace('brother', 'Brother')).join(' or ') || '—'}
            </span>
          </p>
        </div>

        {!hasApprovalAccess ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
            Your role does not require approvals from others, and others cannot approve yours.
          </div>
        ) : null}

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        {loading ? (
          <p className="text-sm text-zinc-500">Loading approvals...</p>
        ) : null}

        {!loading && transactions.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
            No pending approvals for you right now.
          </div>
        ) : null}

        <div className="space-y-4">
          {transactions.map((tx) => {
            const creator = tx.createdBy as Record<string, string>
            const txId = tx.id as string
            const isProcessing = processingId === txId
            const canAct = hasApprovalAccess && isApprovalAllowed(creator?.role, user.role)

            return (
              <div
                key={txId}
                className="rounded-2xl border border-zinc-200 bg-white p-4"
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold capitalize">{(tx.transactionType as string)}</span>
                      <span className="rounded-full border border-zinc-200 px-2 py-0.5 text-xs capitalize">
                        {tx.status as string}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-700">
                      Amount: <span className="font-medium">₹{Number(tx.amount).toLocaleString('en-IN')}</span>
                    </p>
                    {tx.product ? (
                      <p className="text-sm text-zinc-700">Product: {(tx.product as string)}</p>
                    ) : null}
                    {tx.person ? (
                      <p className="text-sm text-zinc-700">Person: {(tx.person as string)}</p>
                    ) : null}
                    {tx.notes ? (
                      <p className="text-xs text-zinc-500">Notes: {(tx.notes as string)}</p>
                    ) : null}
                    <p className="text-xs text-zinc-500">
                      Created by {creator?.name ?? '—'} ({creator?.role}) on {new Date(tx.createdAt as string).toLocaleString('en-IN')}
                    </p>
                  </div>

                  {canAct ? (
                    <div className="mt-3 flex flex-col gap-2 md:mt-0 md:w-72">
                      <textarea
                        className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm"
                        placeholder="Optional comment..."
                        rows={2}
                        value={commentMap[txId] ?? ''}
                        onChange={(e) => handleCommentChange(txId, e.target.value)}
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleAction(txId, 'approve')}
                          disabled={isProcessing}
                          className="flex-1 rounded-xl bg-emerald-500 px-3 py-2 text-sm text-white disabled:opacity-60"
                        >
                          {isProcessing ? 'Saving...' : 'Approve'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAction(txId, 'reject')}
                          disabled={isProcessing}
                          className="flex-1 rounded-xl border border-red-200 px-3 py-2 text-sm text-red-600 disabled:opacity-60"
                        >
                          {isProcessing ? 'Saving...' : 'Reject'}
                        </button>
                      </div>
                    </div>
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
