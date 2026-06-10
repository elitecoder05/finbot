'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/components/providers/auth'
import { TopBar } from '@/components/layout/top-bar'
import { Sidebar } from '@/components/layout/sidebar'
import type { AIExtractionResult } from '@/types'

export default function SettingsPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [activeTab, setActiveTab] = useState<'settings' | 'test'>('settings')

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-lg font-semibold">AI Settings</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Configure Gemini API and test extraction.</p>
          </div>

          <div className="flex gap-2 border-b border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`rounded-t-lg px-4 py-2 text-sm ${
                activeTab === 'settings'
                  ? 'border-b-2 border-zinc-900 bg-zinc-50 font-medium dark:border-zinc-100 dark:bg-zinc-900'
                  : 'text-zinc-600 dark:text-zinc-400'
              }`}
            >
              Configuration
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('test')}
              className={`rounded-t-lg px-4 py-2 text-sm ${
                activeTab === 'test'
                  ? 'border-b-2 border-zinc-900 bg-zinc-50 font-medium dark:border-zinc-100 dark:bg-zinc-900'
                  : 'text-zinc-600 dark:text-zinc-400'
              }`}
            >
              Extraction Test
            </button>
          </div>

          {activeTab === 'settings' ? <SettingsForm /> : <ExtractionTest />}
        </main>
      </div>
    </div>
  )
}

function SettingsForm() {
  const { isLoading: authLoading } = useAuth()
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    geminiApiKey: '',
    modelName: 'gemini-2.0-flash',
    temperature: 0.1,
    confidenceThreshold: 0.7,
    hasKey: false,
  })

  useEffect(() => {
    if (authLoading) return
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch('/api/settings')
        if (!res.ok) throw new Error('Failed to load settings')
        const data = await res.json()
        if (!cancelled) {
          setForm({
            geminiApiKey: data.geminiApiKey || '',
            modelName: data.modelName || 'gemini-2.0-flash',
            temperature: data.temperature ?? 0.1,
            confidenceThreshold: data.confidenceThreshold ?? 0.7,
            hasKey: !!data.hasKey,
          })
        }
      } catch {
        if (!cancelled) setError('Failed to load settings')
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [authLoading])

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      setSaving(true)
      setMessage(null)
      setError(null)
      try {
        const res = await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            geminiApiKey: form.geminiApiKey,
            modelName: form.modelName,
            temperature: form.temperature,
            confidenceThreshold: form.confidenceThreshold,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to save settings')
        setForm((prev) => ({ ...prev, geminiApiKey: data.geminiApiKey || '', hasKey: !!data.hasKey }))
        setMessage('Settings saved successfully')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save settings')
      } finally {
        setSaving(false)
      }
    },
    [form]
  )

  if (authLoading) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white/80 p-6 dark:border-zinc-800 dark:bg-zinc-900/70">
        <p className="text-sm text-zinc-500">Loading...</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-2xl border border-zinc-200 bg-white/80 p-6 dark:border-zinc-800 dark:bg-zinc-900/70">
        <h2 className="mb-4 text-sm font-semibold">Gemini Configuration</h2>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm">Gemini API Key</label>
            <input
              type="password"
              value={form.geminiApiKey}
              onChange={(e) => setForm((prev) => ({ ...prev, geminiApiKey: e.target.value }))}
              placeholder={form.hasKey ? '••••••••' : 'Enter API key'}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
            {form.hasKey ? (
              <p className="text-xs text-zinc-500">API key is currently configured.</p>
            ) : (
              <p className="text-xs text-zinc-500">No API key configured. Extraction will fail without one.</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-sm">Model Name</label>
            <input
              type="text"
              value={form.modelName}
              onChange={(e) => setForm((prev) => ({ ...prev, modelName: e.target.value }))}
              placeholder="gemini-2.0-flash"
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm">Temperature: {form.temperature.toFixed(2)}</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={form.temperature}
              onChange={(e) => setForm((prev) => ({ ...prev, temperature: parseFloat(e.target.value) }))}
              className="w-full"
            />
            <p className="text-xs text-zinc-500">Lower = more deterministic, higher = more creative</p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm">Confidence Threshold: {(form.confidenceThreshold * 100).toFixed(0)}%</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={form.confidenceThreshold}
              onChange={(e) => setForm((prev) => ({ ...prev, confidenceThreshold: parseFloat(e.target.value) }))}
              className="w-full"
            />
            <p className="text-xs text-zinc-500">Extractions below this threshold will require user confirmation</p>
          </div>

          {message ? (
            <p className="text-sm text-lime-600 dark:text-lime-400">{message}</p>
          ) : null}
          {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}

          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </form>
  )
}

function ExtractionTest() {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    extraction: AIExtractionResult
    validation: { isValid: boolean; requiresUserConfirmation: boolean; warnings: string[]; errors: string[]; confidence: number }
    rawGeminiOutput?: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleTest = useCallback(async () => {
    if (!input.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: input.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Extraction failed')
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Extraction failed')
    } finally {
      setLoading(false)
    }
  }, [input])

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-200 bg-white/80 p-6 dark:border-zinc-800 dark:bg-zinc-900/70">
        <h2 className="mb-4 text-sm font-semibold">Test Extraction</h2>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm">Transaction Input</label>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. Bought 1500 worth cement from Suresh"
              rows={3}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
          </div>

          <button
            type="button"
            onClick={handleTest}
            disabled={loading || !input.trim()}
            className="rounded-xl bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {loading ? 'Extracting...' : 'Test Extraction'}
          </button>

          {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
        </div>
      </div>

      {result ? (
        <>
          <div className="rounded-2xl border border-zinc-200 bg-white/80 p-6 dark:border-zinc-800 dark:bg-zinc-900/70">
            <h2 className="mb-4 text-sm font-semibold">Parsed Output</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Transaction Type">
                <span className="text-sm font-medium capitalize">{result.extraction.transactionType}</span>
              </Field>
              <Field label="Amount">
                <span className="text-sm font-medium">{result.extraction.amount != null ? `₹${result.extraction.amount.toLocaleString('en-IN')}` : '—'}</span>
              </Field>
              <Field label="Product">
                <span className="text-sm">{result.extraction.product ?? '—'}</span>
              </Field>
              <Field label="Vendor">
                <span className="text-sm">{result.extraction.vendor ?? '—'}</span>
              </Field>
              <Field label="Customer">
                <span className="text-sm">{result.extraction.customer ?? '—'}</span>
              </Field>
              <Field label="Payment Direction">
                <span className="text-sm capitalize">{result.extraction.paymentDirection ?? '—'}</span>
              </Field>
              <Field label="Quantity">
                <span className="text-sm">{result.extraction.quantity != null ? `${result.extraction.quantity} ${result.extraction.unit ?? ''}`.trim() : '—'}</span>
              </Field>
              <Field label="Confidence">
                <span className="text-sm font-medium">{(result.extraction.confidence * 100).toFixed(0)}%</span>
              </Field>
            </div>

            <div className="mt-4">
              <span className="text-xs font-medium text-zinc-500">Validation</span>
              <div className="mt-1 space-y-1">
                {result.validation.warnings.map((w, i) => (
                  <p key={i} className="text-xs text-yellow-700 dark:text-yellow-400">{w}</p>
                ))}
                {result.validation.errors.map((e, i) => (
                  <p key={i} className="text-xs text-red-700 dark:text-red-400">{e}</p>
                ))}
                {result.validation.warnings.length === 0 && result.validation.errors.length === 0 ? (
                  <p className="text-xs text-lime-600 dark:text-lime-400">No issues detected</p>
                ) : null}
              </div>
            </div>

            {result.rawGeminiOutput && (
              <details className="mt-4">
                <summary className="cursor-pointer text-xs font-medium text-zinc-500">Raw Gemini Response</summary>
                <pre className="mt-2 overflow-x-auto rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs dark:border-zinc-700 dark:bg-zinc-950">
                  {result.rawGeminiOutput}
                </pre>
              </details>
            )}
          </div>
        </>
      ) : null}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="text-xs text-zinc-500">{label}</span>
      <div className="mt-1">{children}</div>
    </div>
  )
}
