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

interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  extraction?: AIExtractionResult
  transactionId?: string
  timestamp: Date
}

function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// WhatsApp-style chat wallpaper as inline SVG data URI
const WALLPAPER_STYLE = {
  backgroundColor: '#E5DDD5',
  backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c8bdb4' fill-opacity='0.25'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
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

  const handleSubmit = useCallback(
    async (value?: string) => {
      const text = (value ?? input).trim()
      if (!text || isProcessing) return

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
        const result = await extractTransaction(text)

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

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
          prev.map((msg) => (msg.extraction === extraction ? { ...msg, extraction: undefined } : msg))
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
      prev.map((msg) => (msg.extraction === extraction ? { ...msg, extraction: undefined } : msg))
    )
  }, [])

  if (isLoading) {
    return (
      <div className="flex h-screen flex-col" style={{ backgroundColor: '#111B21' }}>
        <div className="flex h-14 items-center px-4" style={{ backgroundColor: '#075E54' }}>
          <span className="text-sm text-white/60">Loading...</span>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="flex h-screen flex-col" style={{ backgroundColor: '#111B21' }}>
      <TopBar />

      {/* Chat area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto px-3 py-4 md:px-6" style={WALLPAPER_STYLE}>

          {/* Empty state: sample prompts */}
          {messages.length === 0 && !isProcessing && (
            <div className="flex flex-col items-center gap-4 py-8">
              {/* WhatsApp-style lock notice */}
              <div
                className="flex items-center gap-2 rounded-lg px-4 py-2 text-xs"
                style={{ backgroundColor: '#FFF3CD', color: '#856404' }}
              >
                <span>🔒</span>
                <span>Messages are end-to-end encrypted</span>
              </div>

              <p className="text-sm text-center" style={{ color: '#667781' }}>
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
                        style={{ backgroundColor: '#DCF8C6', color: '#111B21' }}
                      >
                        {/* Tail */}
                        <div
                          className="absolute -right-[6px] top-0"
                          style={{
                            width: 0,
                            height: 0,
                            borderLeft: '6px solid #DCF8C6',
                            borderBottom: '6px solid transparent',
                          }}
                        />
                        <p className="break-words leading-relaxed">{msg.content}</p>
                        <div className="mt-1 flex items-center justify-end gap-1">
                          <span className="text-[11px]" style={{ color: '#667781' }}>
                            {formatTime(msg.timestamp)}
                          </span>
                          {/* Read ticks */}
                          <svg width="16" height="11" viewBox="0 0 16 11" fill="none">
                            <path d="M11.071.653 4.42 7.3 1.929 4.81.515 6.224l3.905 3.905L12.485 2.067 11.07.653Z" fill="#4FC3F7"/>
                            <path d="M15.071.653 8.42 7.3l-.91-.91-1.414 1.414 2.324 2.324 8.065-8.062L15.07.653Z" fill="#4FC3F7"/>
                          </svg>
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
                      style={{ backgroundColor: '#FFCDD2', color: '#C62828' }}
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
                    {msg.extraction ? (
                      <div
                        className="relative rounded-tr-2xl rounded-br-2xl rounded-bl-2xl shadow-sm overflow-hidden"
                        style={{ backgroundColor: '#fff' }}
                      >
                        {/* Tail */}
                        <div
                          className="absolute -left-[6px] top-0"
                          style={{
                            width: 0,
                            height: 0,
                            borderRight: '6px solid #fff',
                            borderBottom: '6px solid transparent',
                          }}
                        />
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
                          <span className="text-[11px]" style={{ color: '#667781' }}>
                            {formatTime(msg.timestamp)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div
                        className="relative rounded-tr-2xl rounded-br-2xl rounded-bl-2xl px-3 py-2 text-sm shadow-sm"
                        style={{ backgroundColor: '#fff', color: '#111B21' }}
                      >
                        {/* Tail */}
                        <div
                          className="absolute -left-[6px] top-0"
                          style={{
                            width: 0,
                            height: 0,
                            borderRight: '6px solid #fff',
                            borderBottom: '6px solid transparent',
                          }}
                        />
                        {/* Bot label */}
                        <span className="text-xs font-semibold" style={{ color: '#25D366' }}>
                          FinBot
                        </span>
                        <p className="mt-0.5 break-words leading-relaxed whitespace-pre-line">{msg.content}</p>
                        <div className="mt-1 flex justify-end">
                          <span className="text-[11px]" style={{ color: '#667781' }}>
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
                  className="relative rounded-tr-2xl rounded-br-2xl rounded-bl-2xl px-4 py-3 shadow-sm"
                  style={{ backgroundColor: '#fff' }}
                >
                  <div
                    className="absolute -left-[6px] top-0"
                    style={{
                      width: 0,
                      height: 0,
                      borderRight: '6px solid #fff',
                      borderBottom: '6px solid transparent',
                    }}
                  />
                  <div className="flex items-center gap-1">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="h-2 w-2 rounded-full animate-bounce"
                        style={{
                          backgroundColor: '#90A4AE',
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
        <div
          className="flex items-end gap-2 px-3 py-2 md:px-4"
          style={{ backgroundColor: '#1F2C33' }}
        >
          <button
            type="button"
            className="mb-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-white/10"
            title="Attach file"
          >
            <Paperclip size={20} style={{ color: '#8696A0' }} />
          </button>

          <div
            className="flex flex-1 items-end rounded-3xl px-4 py-2"
            style={{ backgroundColor: '#2A3942' }}
          >
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Type a transaction..."
              disabled={isProcessing}
              className="flex-1 resize-none bg-transparent text-sm outline-none disabled:opacity-60 leading-relaxed"
              style={{ color: '#E9EDEF', caretColor: '#25D366', maxHeight: 120 }}
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
