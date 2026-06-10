'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/components/providers/auth'
import { TopBar } from '@/components/layout/top-bar'
import { getApprovalPermissionRules } from '@/lib/rbac'
import { extractTransaction, createTransaction } from '@/lib/api/transactions'
import { ExtractionCard } from '@/components/chat/extraction-card'
import type { AIExtractionResult } from '@/types'

const SAMPLE_INPUTS = [
  'Bought 1500 worth cement from Suresh',
  'Purchased 25 bags cement from Ravi for 15000',
  'Paid Kumar 5000 labor charges',
  'Sold bricks worth 10000 to Ganesh',
]

interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  extraction?: AIExtractionResult
  transactionId?: string
  timestamp: Date
}

function formatTime(iso: Date) {
  return iso.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function DashboardPage() {
  const { user, isLoading } = useAuth()
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const allowedApprovers = getApprovalPermissionRules(user?.role ?? null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      const value = input.trim()
      if (!value || isProcessing) return

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: value,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, userMessage])
      setInput('')
      setIsProcessing(true)

      try {
        const result = await extractTransaction(value)

        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: 'Detected Transaction',
          extraction: result.extraction as AIExtractionResult,
          timestamp: new Date(),
        }

        setMessages((prev) => [...prev, assistantMessage])
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
    [input, isProcessing]
  )

  const handleSaveTransaction = useCallback(
    async (extraction: AIExtractionResult) => {
      if (!user) return

      try {
        const result = await createTransaction({
          transactionType: extraction.transactionType,
          amount: extraction.amount ?? 0,
          product: extraction.product,
          vendor: extraction.vendor,
          customer: extraction.customer,
          quantity: extraction.quantity ?? undefined,
          unit: extraction.unit,
          notes: extraction.notes,
          paymentDirection: extraction.paymentDirection ?? 'outgoing',
        })

        const transaction = result.transaction
        const savedMessage: ChatMessage = {
          id: `saved-${Date.now()}`,
          role: 'assistant',
          content: `Transaction saved successfully. Status: ${transaction.status}. ${
            transaction.status === 'pending'
              ? `Awaiting approval from: ${allowedApprovers.join(' or ') || '—'}`
              : 'This transaction is now final.'
          }`,
          transactionId: transaction.id,
          timestamp: new Date(),
        }

        setMessages((prev) => prev.map((msg) => (msg.extraction === extraction ? { ...msg, extraction: undefined } : msg)))
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
    setMessages((prev) => prev.map((msg) => (msg.extraction === extraction ? { ...msg, extraction: undefined } : msg)))
  }, [])

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <TopBar />
        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-6">
          <span className="text-sm text-zinc-500">Loading...</span>
        </main>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-semibold">Chat</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Signed in as <span className="font-medium">{user.name}</span> ({user.role}). Transactions created by this user must be
            approved by: {allowedApprovers.join(' or ') || '—'}.
          </p>
        </div>

        <div className="flex-1">
          <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white/60 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
            {messages.length === 0 && !isProcessing ? (
              <div className="space-y-3">
                <p className="text-sm text-zinc-500">Try typing a transaction, for example:</p>
                {SAMPLE_INPUTS.map((text) => (
                  <button
                    key={text}
                    type="button"
                    onClick={() => setInput(text)}
                    className="block w-full max-w-2xl rounded-xl border border-zinc-200 bg-white px-4 py-3 text-left text-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                  >
                    {text}
                  </button>
                ))}
              </div>
            ) : null}

            {messages.map((msg) => {
              if (msg.role === 'user') {
                return (
                  <div key={msg.id} className="flex flex-col gap-1">
                    <span className="text-xs text-zinc-500">{formatTime(msg.timestamp)}</span>
                    <span className="max-w-2xl rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-950">
                      {msg.content}
                    </span>
                  </div>
                )
              }

              if (msg.role === 'system') {
                return (
                  <div key={msg.id} className="flex flex-col gap-1">
                    <span className="max-w-2xl rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
                      {msg.content}
                    </span>
                  </div>
                )
              }

              if (msg.extraction) {
                return (
                  <div key={msg.id} className="flex flex-col gap-1">
                    <span className="text-xs text-zinc-500">{formatTime(msg.timestamp)}</span>
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
                  </div>
                )
              }

              return (
                <div key={msg.id} className="flex flex-col gap-1">
                  <span className="text-xs text-zinc-500">{formatTime(msg.timestamp)}</span>
                  <span className="max-w-2xl rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-950">
                    {msg.content}
                  </span>
                </div>
              )
            })}

            {isProcessing ? (
              <div className="flex flex-col gap-1">
                <span className="text-xs text-zinc-500">{formatTime(new Date())}</span>
                <span className="max-w-2xl rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm italic text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
                  Extracting transaction...
                </span>
              </div>
            ) : null}

            <div ref={messagesEndRef} />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="sticky bottom-4">
          <div className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white/80 px-3 py-2 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/70">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a transaction..."
              disabled={isProcessing}
              className="flex-1 bg-transparent text-sm outline-none disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={isProcessing || !input.trim()}
              className="rounded-xl bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {isProcessing ? 'Processing...' : 'Send'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
