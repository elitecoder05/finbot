'use client'

import { useCallback, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/auth'
import { UserRole } from '@/types'

const USERS: { role: UserRole; label: string }[] = [
  { role: 'father', label: 'Father' },
  { role: 'brother', label: 'Brother' },
  { role: 'me', label: 'Me' },
]

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Chat' },
  { href: '/approvals', label: 'Pending Approvals' },
  { href: '/transactions', label: 'History' },
  { href: '/analytics', label: 'Analytics' },
]

export function TopBar() {
  const { user, refresh, logout } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const handleRoleSwitch = useCallback(
    async (role: UserRole) => {
      setOpen(false)
      try {
        await fetch('/api/auth/switch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role }),
        })
        await refresh()
      } catch (err) {
        console.error('Role switch failed:', err)
      }
    },
    [refresh]
  )

  const handleLogout = useCallback(async () => {
    setOpen(false)
    await logout()
  }, [logout])

  if (!user) return null

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/70">
      <div className="mx-auto max-w-6xl flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <span className="text-sm font-semibold tracking-tight">Family Finance Recorder</span>
          <nav className="hidden gap-1 md:flex">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
              return (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => router.push(item.href)}
                  className={`rounded-lg px-3 py-1.5 text-sm ${
                    active ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
                  }`}
                >
                  {item.label}
                </button>
              )
            })}
          </nav>
        </div>

        <div className="relative flex items-center gap-3 text-sm">
          <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-zinc-200 px-2 py-1 dark:border-zinc-800">
            <span className="h-2 w-2 rounded-full bg-lime-500" />
            {user.name}
          </span>
          <span className="rounded-full border border-zinc-200 px-2 py-1 dark:border-zinc-800 capitalize">{user.role}</span>

          <div className="relative">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="inline-flex items-center justify-center rounded-lg border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700"
            >
              User
            </button>
            {open ? (
              <div className="absolute right-0 mt-2 w-48 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="border-b border-zinc-100 px-3 py-2 dark:border-zinc-800">
                  <p className="text-xs text-zinc-500">Switch user</p>
                </div>
                {USERS.map((u) => (
                  <button
                    key={u.role}
                    type="button"
                    onClick={() => handleRoleSwitch(u.role)}
                    className={`flex w-full items-center px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                      user.role === u.role ? 'font-medium' : ''
                    }`}
                  >
                    {u.label}
                    {user.role === u.role ? (
                      <span className="ml-auto text-xs text-zinc-400">current</span>
                    ) : null}
                  </button>
                ))}
                <div className="border-t border-zinc-100 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center px-3 py-2 text-left text-sm text-red-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    Logout
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  )
}
