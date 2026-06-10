export interface ExtractionApiResponse {
  extraction: {
    transactionType: string
    amount: number | null
    product: string | null
    vendor: string | null
    customer: string | null
    quantity: number | null
    unit: string | null
    notes: string | null
    confidence: number
    date?: string | null
    paymentDirection?: 'incoming' | 'outgoing' | null
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
    vendor: string
    customer: string
    quantity: number | null
    unit: string | null
    paymentDirection: string
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
  vendor?: string | null
  customer?: string | null
  quantity?: number | null
  unit?: string | null
  notes?: string | null
  date?: string | null
  paymentDirection?: string | null
}): Promise<TransactionApiResponse> {
  const res = await fetch('/api/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to save transaction' }))
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
    throw new Error(error.error || 'Failed to process approval')
  }

  return res.json()
}

export async function fetchTransactions(status?: string) {
  const url = status ? `/api/transactions?status=${encodeURIComponent(status)}` : '/api/transactions'
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error('Failed to fetch transactions')
  }
  return res.json() as Promise<{ transactions: Array<Record<string, unknown>> }>
}
