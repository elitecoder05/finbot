'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAuth } from '@/components/providers/auth'

function LoadingState() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-sm text-zinc-500">Loading...</div>
    </div>
  )
}

function LoginPage() {
  const { login, isLoading } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)
    const username = String(formData.get('username') || '').trim()
    const password = String(formData.get('password') || '')

    try {
      await login(username, password)
      router.replace('/dashboard')
      router.refresh()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed'
      alert(message)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6 rounded-xl border border-zinc-200 bg-white/70 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
        <div className="space-y-1 text-center">
          <h1 className="text-xl font-semibold">Family Finance Recorder</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Sign in to continue</p>
        </div>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <label className="block text-sm">Username</label>
            <input name="username" required autoComplete="username" className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950" />
          </div>
          <div className="space-y-2">
            <label className="block text-sm">Password</label>
            <input name="password" type="password" required autoComplete="current-password" className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950" />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-zinc-900 px-3 py-2 text-sm text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  )
}

export default function Page() {
  const { user, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && user) {
      window.location.href = '/dashboard'
    }
  }, [user, isLoading])

  if (isLoading) return <LoadingState />
  if (!user) return <LoginPage />
  return null
}
