import { useState, useEffect, useRef, useCallback } from 'react'
import type { AIExtractionResult } from '@/types'

const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  purchase: 'Purchase',
  payment: 'Payment',
}

interface Party {
  id: string
  name: string
  type: string
  score?: number
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

  // Person fuzzy search state
  const [personSuggestions, setPersonSuggestions] = useState<Party[]>([])
  const [showPersonSuggestions, setShowPersonSuggestions] = useState(false)
  const [personSearchLoading, setPersonSearchLoading] = useState(false)
  const [showNewPersonPrompt, setShowNewPersonPrompt] = useState(false)
  const [newPersonName, setNewPersonName] = useState('')
  const [addingPerson, setAddingPerson] = useState(false)
  const personInputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

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

  // Fuzzy search for persons
  const searchPersons = useCallback(async (query: string) => {
    if (!query || query.trim().length < 2) {
      setPersonSuggestions([])
      setShowPersonSuggestions(false)
      return
    }

    setPersonSearchLoading(true)
    try {
      const res = await fetch(`/api/parties?search=${encodeURIComponent(query.trim())}`)
      if (res.ok) {
        const data = await res.json()
        setPersonSuggestions(data.parties || [])
        setShowPersonSuggestions(true)

        // If no close matches found, show "add new person" prompt
        const hasCloseMatch = data.parties?.some((p: Party) => (p.score ?? 0) > 0.7)
        if (!hasCloseMatch && query.trim().length >= 2) {
          setNewPersonName(query.trim())
          setShowNewPersonPrompt(true)
        } else {
          setShowNewPersonPrompt(false)
        }
      }
    } catch {
      // silently fail
    } finally {
      setPersonSearchLoading(false)
    }
  }, [])

  // Debounced person search
  useEffect(() => {
    if (!isEditing) return
    const timer = setTimeout(() => {
      if (edited.person) {
        searchPersons(edited.person)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [edited.person, isEditing, searchPersons])

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        personInputRef.current &&
        !personInputRef.current.contains(e.target as Node)
      ) {
        setShowPersonSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectPerson = (name: string) => {
    handleChange('person', name)
    setShowPersonSuggestions(false)
    setShowNewPersonPrompt(false)
  }

  const addNewPerson = async () => {
    if (!newPersonName.trim()) return
    setAddingPerson(true)
    try {
      const res = await fetch('/api/parties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newPersonName.trim(), type: 'person' }),
      })
      if (res.ok) {
        handleChange('person', newPersonName.trim())
        setShowNewPersonPrompt(false)
        setShowPersonSuggestions(false)
      }
    } catch {
      // silently fail
    } finally {
      setAddingPerson(false)
    }
  }

  return (
    <div className="px-3 pt-3 pb-1">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold" style={{ color: '#16a34a' }}>🧾 Detected Transaction</span>
        <span className="text-xs" style={{ color: '#6b7280' }}>
          {(confidence ?? extraction.confidence ?? 0) > 0 ? `${((confidence ?? extraction.confidence ?? 0) * 100).toFixed(0)}% confidence` : ''}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Amount">
          {isEditing ? (
            <input
              type="number"
              className="mt-1 w-full rounded-md border bg-white px-2 py-1 text-sm"
              style={{ borderColor: '#d1d5db', color: '#111827' }}
              value={edited.amount ?? ''}
              onChange={(e) => handleChange('amount', e.target.value ? parseFloat(e.target.value) : null)}
            />
          ) : (
            <p className="mt-1 text-sm font-semibold" style={{ color: '#111827' }}>
              {extraction.amount != null ? `₹${extraction.amount.toLocaleString('en-IN')}` : '—'}
            </p>
          )}
        </Field>

        <Field label="Type">
          {isEditing ? (
            <select
              className="mt-1 w-full rounded-md border bg-white px-2 py-1 text-sm"
              style={{ borderColor: '#d1d5db', color: '#111827' }}
              value={edited.transactionType}
              onChange={(e) => handleChange('transactionType', e.target.value as AIExtractionResult['transactionType'])}
            >
              {Object.entries(TRANSACTION_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          ) : (
            <p className="mt-1 text-sm font-semibold" style={{ color: '#111827' }}>
              {TRANSACTION_TYPE_LABELS[extraction.transactionType] ?? extraction.transactionType}
            </p>
          )}
        </Field>

        <Field label="Product">
          {isEditing ? (
            <input
              className="mt-1 w-full rounded-md border bg-white px-2 py-1 text-sm"
              style={{ borderColor: '#d1d5db', color: '#111827' }}
              value={edited.product ?? ''}
              onChange={(e) => handleChange('product', e.target.value || null)}
            />
          ) : (
            <p className="mt-1 text-sm" style={{ color: '#111827' }}>{extraction.product ?? '—'}</p>
          )}
        </Field>

        <Field label="Person">
          {isEditing ? (
            <div className="relative">
              <input
                ref={personInputRef}
                className="mt-1 w-full rounded-md border bg-white px-2 py-1 text-sm"
                style={{ borderColor: '#d1d5db', color: '#111827' }}
                value={edited.person ?? ''}
                onChange={(e) => handleChange('person', e.target.value || null)}
                onFocus={() => {
                  if (edited.person && edited.person.length >= 2) {
                    searchPersons(edited.person)
                  }
                }}
                placeholder="Type to search persons..."
              />
              {personSearchLoading && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs" style={{ color: '#9ca3af' }}>...</span>
              )}

              {/* Suggestions dropdown */}
              {showPersonSuggestions && personSuggestions.length > 0 && (
                <div
                  ref={suggestionsRef}
                  className="absolute left-0 right-0 top-full z-50 mt-1 max-h-40 overflow-y-auto rounded-md border bg-white shadow-lg"
                  style={{ borderColor: '#e5e7eb' }}
                >
                  {personSuggestions.map((party) => (
                    <button
                      key={party.id}
                      type="button"
                      onClick={() => selectPerson(party.name)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm"
                      style={{ color: '#111827' }}
                    >
                      <span>{party.name}</span>
                      {party.score && party.score < 0.9 && (
                        <span className="text-xs" style={{ color: '#9ca3af' }}>
                          {Math.round(party.score * 100)}% match
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* New person prompt */}
              {showNewPersonPrompt && !showPersonSuggestions && (
                <div
                  className="absolute left-0 right-0 top-full z-50 mt-1 rounded-md border p-2"
                  style={{ borderColor: '#fde68a', backgroundColor: '#fffbeb' }}
                >
                  <p className="text-xs" style={{ color: '#92400e' }}>
                    Person not found. Add <strong>"{newPersonName}"</strong> to the list?
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={addNewPerson}
                      disabled={addingPerson}
                      className="rounded-md px-3 py-1 text-xs text-white disabled:opacity-50"
                      style={{ backgroundColor: '#d97706' }}
                    >
                      {addingPerson ? 'Adding...' : 'Add Person'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowNewPersonPrompt(false)}
                      className="rounded-md border px-3 py-1 text-xs"
                      style={{ borderColor: '#fcd34d', color: '#b45309' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="mt-1 text-sm" style={{ color: '#111827' }}>{extraction.person ?? '—'}</p>
          )}
        </Field>

        <Field label="Quantity">
          {isEditing ? (
            <input
              type="number"
              className="mt-1 w-full rounded-md border bg-white px-2 py-1 text-sm"
              style={{ borderColor: '#d1d5db', color: '#111827' }}
              value={edited.quantity ?? ''}
              onChange={(e) => handleChange('quantity', e.target.value ? parseFloat(e.target.value) : null)}
            />
          ) : (
            <p className="mt-1 text-sm" style={{ color: '#111827' }}>
              {extraction.quantity != null ? `${extraction.quantity} ${extraction.unit ?? ''}`.trim() : '—'}
            </p>
          )}
        </Field>

        <Field label="Notes">
          {isEditing ? (
            <textarea
              className="mt-1 w-full rounded-md border bg-white px-2 py-1 text-sm"
              style={{ borderColor: '#d1d5db', color: '#111827' }}
              value={edited.notes ?? ''}
              onChange={(e) => handleChange('notes', e.target.value || null)}
              rows={2}
            />
          ) : (
            <p className="mt-1 text-sm" style={{ color: '#111827' }}>{extraction.notes ?? '—'}</p>
          )}
        </Field>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-2" style={{ borderColor: '#e5e7eb' }}>
        {isEditing ? (
          <>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isSaving}
              className="rounded-full px-4 py-1.5 text-sm font-medium text-white disabled:opacity-60"
              style={{ backgroundColor: '#25D366' }}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsEditing(false)
                setEdited(extraction)
              }}
              className="rounded-full border px-4 py-1.5 text-sm"
              style={{ borderColor: '#d1d5db', color: '#374151' }}
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isSaving}
              className="rounded-full px-4 py-1.5 text-sm font-medium text-white disabled:opacity-60"
              style={{ backgroundColor: '#25D366' }}
            >
              {isSaving ? 'Saving...' : '✓ Save Transaction'}
            </button>
            {requiresConfirmation && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="rounded-full border px-4 py-1.5 text-sm"
                style={{ borderColor: '#d1d5db', color: '#374151' }}
              >
                Edit
              </button>
            )}
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="rounded-full px-4 py-1.5 text-sm"
                style={{ color: '#ef4444' }}
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
      <span className="text-xs" style={{ color: '#6b7280' }}>{label}</span>
      {children}
    </div>
  )
}
