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
        <span className="text-xs font-semibold" style={{ color: '#25D366' }}>🧾 Detected Transaction</span>
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

        <Field label="Person">
          {isEditing ? (
            <div className="relative">
              <input
                ref={personInputRef}
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
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
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-zinc-400">...</span>
              )}

              {/* Suggestions dropdown */}
              {showPersonSuggestions && personSuggestions.length > 0 && (
                <div
                  ref={suggestionsRef}
                  className="absolute left-0 right-0 top-full z-50 mt-1 max-h-40 overflow-y-auto rounded-md border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
                >
                  {personSuggestions.map((party) => (
                    <button
                      key={party.id}
                      type="button"
                      onClick={() => selectPerson(party.name)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      <span>{party.name}</span>
                      {party.score && party.score < 0.9 && (
                        <span className="text-xs text-zinc-400">
                          {Math.round(party.score * 100)}% match
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* New person prompt */}
              {showNewPersonPrompt && !showPersonSuggestions && (
                <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-md border border-amber-200 bg-amber-50 p-2 dark:border-amber-800 dark:bg-amber-950">
                  <p className="text-xs text-amber-800 dark:text-amber-200">
                    Person not found. Add <strong>"{newPersonName}"</strong> to the list?
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={addNewPerson}
                      disabled={addingPerson}
                      className="rounded-md bg-amber-600 px-3 py-1 text-xs text-white hover:bg-amber-700 disabled:opacity-50"
                    >
                      {addingPerson ? 'Adding...' : 'Add Person'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowNewPersonPrompt(false)}
                      className="rounded-md border border-amber-300 px-3 py-1 text-xs text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">{extraction.person ?? '—'}</p>
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

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-2">
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
              className="rounded-full border border-zinc-300 px-4 py-1.5 text-sm text-zinc-600"
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
                className="rounded-full border border-zinc-300 px-4 py-1.5 text-sm text-zinc-600"
              >
                Edit
              </button>
            )}
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="rounded-full px-4 py-1.5 text-sm text-red-500"
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
