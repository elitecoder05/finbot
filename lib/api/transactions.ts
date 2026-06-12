export interface ExtractionApiResponse {
  extraction: {
    transactionType: string
    amount: number | null
    product: string | null
    person: string | null
    quantity: number | null
    unit: string | null
    notes: string | null
    confidence: number
    date?: string | null
  }
  validation: {
    isValid: boolean
    requiresUserConfirmation: boolean
    warnings: string[]
    errors: string[]
    confidence: number
  }
}

export interface TransactionApiResponse {
  transaction: {
    id: string
    transactionType: string
    amount: number
    product: string
    person: string | null
    quantity: number | null
    unit: string | null
    notes: string | null
    date: string
    confidence: number
    status: string
    createdById: string
    approvedById: string | null
    approvedAt: string | null
    createdAt: string
    updatedAt: string
    createdBy: { id: string; name: string; role: string }
    approvedBy?: { id: string; name: string; role: string } | null
  }
}

type LocalTransactionRecord = TransactionApiResponse['transaction']

const LOCAL_TRANSACTIONS_KEY = 'finbot_local_transactions'

function isBrowser() {
  return typeof window !== 'undefined'
}

function readLocalTransactions(): LocalTransactionRecord[] {
  if (!isBrowser()) return []

  try {
    const raw = window.localStorage.getItem(LOCAL_TRANSACTIONS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as LocalTransactionRecord[]) : []
  } catch {
    return []
  }
}

function writeLocalTransactions(transactions: LocalTransactionRecord[]) {
  if (!isBrowser()) return

  try {
    window.localStorage.setItem(LOCAL_TRANSACTIONS_KEY, JSON.stringify(transactions))
  } catch {
    // Ignore storage errors and continue with the in-memory response.
  }
}

function toLocalTransaction(payload: {
  transactionType: string
  amount: number
  product?: string | null
  person?: string | null
  quantity?: number | null
  unit?: string | null
  notes?: string | null
  date?: string | null
}): LocalTransactionRecord {
  const now = new Date().toISOString()
  return {
    id: `local-${crypto.randomUUID()}`,
    transactionType: payload.transactionType,
    amount: payload.amount,
    product: payload.product ?? '',
    person: payload.person ?? null,
    quantity: payload.quantity ?? null,
    unit: payload.unit ?? null,
    notes: payload.notes ?? null,
    date: payload.date ?? now,
    confidence: 1,
    status: 'pending',
    createdById: 'local-session',
    approvedById: null,
    approvedAt: null,
    createdAt: now,
    updatedAt: now,
    createdBy: {
      id: 'local-session',
      name: 'Local session',
      role: 'me',
    },
    approvedBy: null,
  }
}

export async function extractTransaction(text: string): Promise<ExtractionApiResponse> {
  const res = await fetch('/api/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Extraction failed' }))
    throw new Error(error.error || 'Extraction failed')
  }

  return res.json()
}

export async function createTransaction(payload: {
  transactionType: string
  amount: number
  product?: string | null
  person?: string | null
  quantity?: number | null
  unit?: string | null
  notes?: string | null
  date?: string | null
}): Promise<TransactionApiResponse> {
  const res = await fetch('/api/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to save transaction' }))

    if (isBrowser()) {
      const transaction = toLocalTransaction(payload)
      const transactions = readLocalTransactions()
      writeLocalTransactions([transaction, ...transactions])
      return { transaction } as TransactionApiResponse
    }

    throw new Error(error.error || 'Failed to save transaction')
  }

  return res.json()
}

export async function approveTransaction(transactionId: string, action: 'approve' | 'reject', comment?: string) {
  const res = await fetch(`/api/transactions/${transactionId}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, comment }),
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to process approval' }))

    if (isBrowser()) {
      const status = action === 'approve' ? 'approved' : 'rejected'
      const approvedAt = new Date().toISOString()
      const transactions = readLocalTransactions().map((transaction) =>
        transaction.id === transactionId
          ? {
              ...transaction,
              status,
              approvedById: 'local-session',
              approvedAt,
              updatedAt: approvedAt,
              isRejected: action === 'reject',
            }
          : transaction
      )
      writeLocalTransactions(transactions)

      const transaction = transactions.find((entry) => entry.id === transactionId)
      return { transaction } as { transaction: Record<string, unknown> }
    }

    throw new Error(error.error || 'Failed to process approval')
  }

  return res.json()
}

export async function fetchTransactions(status?: string) {
  const url = status ? `/api/transactions?status=${encodeURIComponent(status)}` : '/api/transactions'
  try {
    const res = await fetch(url)
    if (!res.ok) {
      throw new Error('Failed to fetch transactions')
    }

    const data = (await res.json()) as { transactions: Array<Record<string, unknown>> }
    const localTransactions = readLocalTransactions()
    const localFiltered = status
      ? localTransactions.filter((transaction) => transaction.status === status)
      : localTransactions

    if (localFiltered.length === 0) {
      return data
    }

    const merged = [...data.transactions]
    for (const transaction of localFiltered) {
      if (!merged.some((entry) => entry.id === transaction.id)) {
        merged.unshift(transaction)
      }
    }

    return { transactions: merged }
  } catch {
    const localTransactions = readLocalTransactions()
    const filtered = status
      ? localTransactions.filter((transaction) => transaction.status === status)
      : localTransactions
    return { transactions: filtered as Array<Record<string, unknown>> }
  }
}
