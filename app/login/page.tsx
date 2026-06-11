'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAuth } from '@/components/providers/auth'

function LoadingState() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-sm text-gray-500">Loading...</div>
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
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-gray-50">
      {/* Logo area */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <div
          className="flex h-20 w-20 items-center justify-center rounded-full"
          style={{ backgroundColor: '#25D366' }}
        >
          <svg viewBox="0 0 24 24" fill="white" width="44" height="44">
            <path d="M20.52 3.449C18.24 1.245 15.24 0 12.045 0 5.463 0 .104 5.334.101 11.893c0 2.096.549 4.14 1.595 5.945L0 24l6.335-1.652c1.746.943 3.71 1.444 5.71 1.447h.006c6.585 0 11.946-5.336 11.949-11.896.002-3.176-1.24-6.165-3.48-8.45zm-8.475 18.3h-.004a9.933 9.933 0 01-5.04-1.37l-.36-.214-3.754.978.999-3.648-.235-.375a9.808 9.808 0 01-1.516-5.26c.002-5.45 4.446-9.885 9.908-9.885 2.647 0 5.13 1.03 7.002 2.9 1.87 1.868 2.9 4.35 2.898 6.99-.003 5.452-4.447 9.884-9.898 9.884zm5.43-7.405c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Family Finance</h1>
        <p className="text-sm text-gray-500">AI-powered accounting assistant</p>
      </div>

      <div className="w-full max-w-sm space-y-5 rounded-2xl p-6 shadow-xl bg-white">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-gray-500">
              USERNAME
            </label>
            <input
              name="username"
              required
              autoComplete="username"
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-500"
              style={{
                backgroundColor: '#ffffff',
                color: '#111827',
              }}
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-gray-500">
              PASSWORD
            </label>
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-500"
              style={{
                backgroundColor: '#ffffff',
                color: '#111827',
              }}
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 w-full rounded-full py-3 text-sm font-semibold text-white disabled:opacity-60 transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#25D366' }}
          >
            {isLoading ? 'Signing in...' : 'SIGN IN'}
          </button>
        </form>
      </div>

      <p className="mt-6 text-xs text-gray-500">
        Family Finance Recorder · Powered by AI
      </p>
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
