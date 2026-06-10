import { useState } from 'react'
import type { AIExtractionResult } from '@/types'

const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  purchase: 'Purchase',
  sale: 'Sale',
  expense: 'Expense',
  income: 'Income',
  transfer: 'Transfer',
  advance: 'Advance',
  other: 'Other',
}

const PAYMENT_DIRECTION_LABELS: Record<string, string> = {
  incoming: 'Incoming',
  outgoing: 'Outgoing',
}

interface ExtractionCardProps {
  extraction: AIExtractionResult
  rawText: string
  confidence?: number
  requiresConfirmation?: boolean
  onSubmit?: (extraction: AIExtractionResult) => void
  onCancel?: () => void
  isSaving?: boolean
}

export function ExtractionCard({
  extraction,
  rawText,
  confidence,
  requiresConfirmation = true,
  onSubmit,
  onCancel,
  isSaving = false,
}: ExtractionCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [edited, setEdited] = useState<AIExtractionResult>(extraction)

  const handleChange = <K extends keyof AIExtractionResult>(
    key: K,
    value: AIExtractionResult[K]
  ) => {
    setEdited((prev) => ({ ...prev, [key]: value }))
  }

  const handleConfirm = () => {
    setIsEditing(false)
    onSubmit?.(edited)
  }

  return (
    <div className="mt-2 max-w-2xl rounded-2xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-500">Detected Transaction</span>
        <span className="text-xs text-zinc-400">
          {(confidence ?? extraction.confidence ?? 0) > 0 ? `${((confidence ?? extraction.confidence ?? 0) * 100).toFixed(0)}% confidence` : ''}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Amount">
          {isEditing ? (
            <input
              type="number"
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              value={edited.amount ?? ''}
              onChange={(e) => handleChange('amount', e.target.value ? parseFloat(e.target.value) : null)}
            />
          ) : (
            <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {extraction.amount != null ? `₹${extraction.amount.toLocaleString('en-IN')}` : '—'}
            </p>
          )}
        </Field>

        <Field label="Type">
          {isEditing ? (
            <select
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              value={edited.transactionType}
              onChange={(e) => handleChange('transactionType', e.target.value as AIExtractionResult['transactionType'])}
            >
              {Object.entries(TRANSACTION_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          ) : (
            <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {TRANSACTION_TYPE_LABELS[extraction.transactionType] ?? extraction.transactionType}
            </p>
          )}
        </Field>

        <Field label="Product">
          {isEditing ? (
            <input
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              value={edited.product ?? ''}
              onChange={(e) => handleChange('product', e.target.value || null)}
            />
          ) : (
            <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">{extraction.product ?? '—'}</p>
          )}
        </Field>

        <Field label="Vendor">
          {isEditing ? (
            <input
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              value={edited.vendor ?? ''}
              onChange={(e) => handleChange('vendor', e.target.value || null)}
            />
          ) : (
            <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">{extraction.vendor ?? '—'}</p>
          )}
        </Field>

        <Field label="Customer">
          {isEditing ? (
            <input
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              value={edited.customer ?? ''}
              onChange={(e) => handleChange('customer', e.target.value || null)}
            />
          ) : (
            <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">{extraction.customer ?? '—'}</p>
          )}
        </Field>

        <Field label="Payment Direction">
          {isEditing ? (
            <select
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              value={edited.paymentDirection ?? 'outgoing'}
              onChange={(e) => handleChange('paymentDirection', e.target.value as 'incoming' | 'outgoing')}
            >
              <option value="incoming">Incoming</option>
              <option value="outgoing">Outgoing</option>
            </select>
          ) : (
            <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">
              {extraction.paymentDirection ? PAYMENT_DIRECTION_LABELS[extraction.paymentDirection] ?? extraction.paymentDirection : '—'}
            </p>
          )}
        </Field>

        <Field label="Quantity">
          {isEditing ? (
            <input
              type="number"
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              value={edited.quantity ?? ''}
              onChange={(e) => handleChange('quantity', e.target.value ? parseFloat(e.target.value) : null)}
            />
          ) : (
            <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">
              {extraction.quantity != null ? `${extraction.quantity} ${extraction.unit ?? ''}`.trim() : '—'}
            </p>
          )}
        </Field>

        <Field label="Notes">
          {isEditing ? (
            <textarea
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              value={edited.notes ?? ''}
              onChange={(e) => handleChange('notes', e.target.value || null)}
              rows={2}
            />
          ) : (
            <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">{extraction.notes ?? '—'}</p>
          )}
        </Field>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {isEditing ? (
          <>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isSaving}
              className="rounded-xl bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsEditing(false)
                setEdited(extraction)
              }}
              className="rounded-xl border border-zinc-300 px-4 py-2 text-sm text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isSaving || !requiresConfirmation}
              className="rounded-xl bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
            >
              Save Transaction
            </button>
            {requiresConfirmation && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="rounded-xl border border-zinc-300 px-4 py-2 text-sm text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
              >
                Edit
              </button>
            )}
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="rounded-xl px-4 py-2 text-sm text-red-600 dark:text-red-400"
              >
                Discard
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="text-xs text-zinc-500">{label}</span>
      {children}
    </div>
  )
}
