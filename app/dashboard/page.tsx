'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/components/providers/auth'
import { TopBar } from '@/components/layout/top-bar'
import { getApprovalPermissionRules } from '@/lib/rbac'
import { extractTransaction, createTransaction } from '@/lib/api/transactions'
import { ExtractionCard } from '@/components/chat/extraction-card'
import type { AIExtractionResult } from '@/types'
import { Send, Paperclip, Mic } from 'lucide-react'

const SAMPLE_INPUTS = [
  'Bought 1500 worth cement from Suresh',
  'Purchased 25 bags cement from Ravi for 15000',
  'Paid Kumar 5000 labor charges',
  'Sold bricks worth 10000 to Ganesh',
]

interface MissingField {
  field: 'amount' | 'transactionType' | 'product' | 'person'
  label: string
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  extraction?: AIExtractionResult
  transactionId?: string
  timestamp: Date
  missingFields?: MissingField[]
}

function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// Light theme background
const CHAT_BG_STYLE = {
  backgroundColor: '#f9fafb',
}

function getMissingFields(data: AIExtractionResult): MissingField[] {
  const mandatoryFields: MissingField[] = [
    { field: 'amount', label: 'Amount' },
    { field: 'transactionType', label: 'Type' },
    { field: 'person', label: 'Person' },
  ]

  if (data.transactionType === 'purchase') {
    mandatoryFields.splice(2, 0, { field: 'product', label: 'Product' })
  }

  return mandatoryFields.filter((field) => {
    const value = data[field.field]
    if (field.field === 'amount') return value === null || value === undefined
    return !value || (typeof value === 'string' && value.trim() === '')
  })
}

function splitTransactionInputs(text: string): string[] {
  return text
    .replace(/\r\n/g, '\n')
    .split(/\n+/)
    .flatMap((line) => line.split(/\s*[;|]\s*/))
    .map((part) => part.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim())
    .filter(Boolean)
}

export default function DashboardPage() {
  const { user, isLoading } = useAuth()
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const allowedApprovers = getApprovalPermissionRules(user?.role ?? null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }

  // Find the extraction message that's currently in follow-up mode
  const getActiveExtraction = useCallback(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i]
      if (msg.role === 'assistant' && msg.extraction && msg.missingFields && msg.missingFields.length > 0) {
        return { message: msg, index: i }
      }
    }
    return null
  }, [messages])

  const createAndAppendExtractionMessage = useCallback(async (segmentText: string) => {
    const result = await extractTransaction(segmentText)

    const extraction = result.extraction as AIExtractionResult
    const missingFields = getMissingFields(extraction)

    const assistantMessage: ChatMessage = {
      id: `assistant-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      role: 'assistant',
      content: missingFields.length > 0
        ? `I need some more information. Please provide ${missingFields[0].label.toLowerCase()}:`
        : 'Detected Transaction',
      extraction,
      missingFields,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, assistantMessage])
  }, [])

  const handleFieldInput = useCallback(
    async (value: string, field: MissingField) => {
      const active = getActiveExtraction()
      if (!active) return

      const { message: msg, index } = active
      let parsedValue: string | number = value

      // Parse value based on field type
      if (field.field === 'amount') {
        parsedValue = parseFloat(value) || 0
      }

      // Update the extraction with the provided value
      const updatedExtraction = { ...msg.extraction!, [field.field]: parsedValue } as AIExtractionResult

      // Check for remaining missing fields
      const remainingMissing = getMissingFields(updatedExtraction)

      if (remainingMissing.length === 0) {
        // All required fields are filled; let the user confirm or discard the updated extraction.
        setMessages((prev) =>
          prev.map((m, i) => (i === index ? { ...m, extraction: updatedExtraction, missingFields: [] } : m))
        )
      } else {
        // Still have missing fields, ask for next one
        setMessages((prev) =>
          prev.map((m, i) => (i === index ? { ...m, extraction: updatedExtraction, missingFields: remainingMissing } : m))
        )
        // Add follow-up prompt message
        const nextField = remainingMissing[0]
        const followUpMessage: ChatMessage = {
          id: `followup-${Date.now()}`,
          role: 'assistant',
          content: `Please provide ${nextField.label.toLowerCase()}:`,
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, followUpMessage])
      }
    },
    [messages, getActiveExtraction]
  )

  const handleSubmit = useCallback(
    async (value?: string) => {
      const text = (value ?? input).trim()
      if (!text || isProcessing) return

      // Check if we're responding to a follow-up prompt
      const active = getActiveExtraction()
      if (active) {
        handleFieldInput(text, active.message.missingFields![0])
        setInput('')
        return
      }

      const segments = splitTransactionInputs(text)
      if (segments.length === 0) return

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: text,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, userMessage])
      setInput('')
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
      setIsProcessing(true)

      try {
        for (const segment of segments) {
          try {
            await createAndAppendExtractionMessage(segment)
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Extraction failed'
            const errorMessage: ChatMessage = {
              id: `error-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              role: 'system',
              content: `Error: ${message}`,
              timestamp: new Date(),
            }
            setMessages((prev) => [...prev, errorMessage])
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Extraction failed'
        const errorMessage: ChatMessage = {
          id: `error-${Date.now()}`,
          role: 'system',
          content: `Error: ${message}`,
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, errorMessage])
      } finally {
        setIsProcessing(false)
      }
    },
    [input, isProcessing, getActiveExtraction, handleFieldInput, createAndAppendExtractionMessage]
  )

  const handleSaveTransaction = useCallback(
    async (extraction: AIExtractionResult) => {
      if (!user) return

      try {
        const result = await createTransaction({
          transactionType: extraction.transactionType,
          amount: extraction.amount ?? 0,
          product: extraction.product,
          person: extraction.person,
          quantity: extraction.quantity ?? undefined,
          unit: extraction.unit,
          notes: extraction.notes,
        })

        const transaction = result.transaction
        const savedMessage: ChatMessage = {
          id: `saved-${Date.now()}`,
          role: 'assistant',
          content: `✅ Transaction saved! Status: *${transaction.status}*. ${
            transaction.status === 'pending'
              ? `Awaiting approval from: ${allowedApprovers.join(' or ') || '—'}`
              : 'This transaction is now final.'
          }`,
          transactionId: transaction.id,
          timestamp: new Date(),
        }

        setMessages((prev) =>
          prev.map((msg) => (msg.extraction === extraction ? { ...msg, extraction: undefined, missingFields: undefined } : msg))
        )
        setMessages((prev) => [...prev, savedMessage])
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save transaction'
        const errorMessage: ChatMessage = {
          id: `error-${Date.now()}`,
          role: 'system',
          content: `Error: ${message}`,
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, errorMessage])
      }
    },
    [user, allowedApprovers]
  )

  const handleDiscard = useCallback((extraction?: AIExtractionResult) => {
    if (!extraction) return
    setMessages((prev) =>
      prev.map((msg) => (msg.extraction === extraction ? { ...msg, extraction: undefined, missingFields: undefined } : msg))
    )
  }, [])

  if (isLoading) {
    return (
      <div className="flex h-screen flex-col bg-gray-50">
        <div className="flex h-14 items-center px-4 border-b border-gray-200 bg-white">
          <span className="text-sm" style={{ color: '#6b7280' }}>Loading...</span>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      <TopBar />

      {/* Chat area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto px-3 py-4 md:px-6" style={CHAT_BG_STYLE}>

          {/* Empty state: sample prompts */}
          {messages.length === 0 && !isProcessing && (
            <div className="flex flex-col items-center gap-4 py-8">
              <p className="text-sm text-center" style={{ color: '#6b7280' }}>
                Try typing a transaction below, or tap one of these examples:
              </p>

              <div className="flex flex-wrap justify-center gap-2 max-w-sm">
                {SAMPLE_INPUTS.map((text) => (
                  <button
                    key={text}
                    type="button"
                    onClick={() => handleSubmit(text)}
                    className="rounded-full px-3 py-1.5 text-xs font-medium transition-colors hover:opacity-90"
                    style={{ backgroundColor: '#25D366', color: '#fff' }}
                  >
                    {text}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex flex-col gap-1">
            {messages.map((msg) => {
              if (msg.role === 'user') {
                return (
                  <div key={msg.id} className="flex justify-end">
                    <div className="max-w-[75%] md:max-w-[60%]">
                      <div
                        className="relative rounded-tl-2xl rounded-bl-2xl rounded-br-2xl px-3 py-2 text-sm shadow-sm"
                        style={{ backgroundColor: '#dcfce7', color: '#111827' }}
                      >
                        <p className="break-all leading-relaxed">{msg.content}</p>
                        <div className="mt-1 flex items-center justify-end gap-1">
                          <span className="text-[11px] text-gray-500">
                            {formatTime(msg.timestamp)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              }

              if (msg.role === 'system') {
                return (
                  <div key={msg.id} className="flex justify-center py-1">
                    <span
                      className="rounded-lg px-3 py-1.5 text-xs"
                      style={{ backgroundColor: '#fee2e2', color: '#991b1b' }}
                    >
                      {msg.content}
                    </span>
                  </div>
                )
              }

              // Assistant message (with or without extraction)
              return (
                <div key={msg.id} className="flex justify-start">
                  <div className="max-w-[85%] md:max-w-[70%]">
                    {msg.extraction && (!msg.missingFields || msg.missingFields.length === 0) ? (
                      <div
                        className="relative rounded-tr-2xl rounded-br-2xl rounded-bl-2xl shadow-sm overflow-hidden"
                        style={{ backgroundColor: '#ffffff' }}
                      >
                        <ExtractionCard
                          extraction={msg.extraction}
                          rawText={msg.content}
                          confidence={msg.extraction.confidence}
                          requiresConfirmation={msg.extraction.confidence < 0.7}
                          onSubmit={(updated) => {
                            setMessages((prev) =>
                              prev.map((m) => (m.id === msg.id ? { ...m, extraction: updated } : m))
                            )
                            handleSaveTransaction(updated)
                          }}
                          onCancel={() => handleDiscard(msg.extraction)}
                        />
                        <div className="px-3 pb-2 flex justify-end">
                          <span className="text-[11px]" style={{ color: '#6b7280' }}>
                            {formatTime(msg.timestamp)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div
                        className="relative rounded-tr-2xl rounded-br-2xl rounded-bl-2xl px-3 py-2 text-sm shadow-sm"
                        style={{ backgroundColor: '#ffffff', color: '#111827' }}
                      >
                        {/* Bot label */}
                        <span className="text-xs font-semibold" style={{ color: '#16a34a' }}>
                          FinBot
                        </span>
                        <p className="mt-0.5 break-all leading-relaxed whitespace-pre-line">{msg.content}</p>
                        <div className="mt-1 flex justify-end">
                          <span className="text-[11px]" style={{ color: '#6b7280' }}>
                            {formatTime(msg.timestamp)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Typing indicator */}
            {isProcessing && (
              <div className="flex justify-start">
                <div
                  className="relative rounded-tr-2xl rounded-br-2xl rounded-bl-2xl px-4 py-3 shadow-sm bg-white"
                >
                  <div className="flex items-center gap-1">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="h-2 w-2 rounded-full animate-bounce"
                        style={{
                          backgroundColor: '#9ca3af',
                          animationDelay: `${i * 0.15}s`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div ref={messagesEndRef} />
        </div>

        {/* Input bar */}
        <div className="flex items-end gap-2 px-3 py-2 md:px-4 border-t border-gray-200 bg-white">
          <button
            type="button"
            className="mb-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-gray-100"
            title="Attach file"
          >
            <Paperclip size={20} style={{ color: '#6b7280' }} />
          </button>

          <div className="flex flex-1 items-end rounded-3xl px-4 py-2 bg-gray-100">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={handleInputChange}
              placeholder="Type a transaction..."
              disabled={isProcessing}
              className="flex-1 resize-none bg-transparent text-sm outline-none disabled:opacity-60 leading-relaxed"
              style={{ color: '#111827', caretColor: '#25D366', maxHeight: 120 }}
            />
          </div>

          <button
            type="button"
            onClick={() => input.trim() ? handleSubmit() : undefined}
            disabled={isProcessing}
            className="mb-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-60"
            style={{ backgroundColor: '#25D366' }}
            title={input.trim() ? 'Send' : 'Voice'}
          >
            {input.trim() ? (
              <Send size={18} className="text-white ml-0.5" />
            ) : (
              <Mic size={18} className="text-white" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}