'use client'

import { usePathname } from 'next/navigation'
import { useAuth } from '@/components/providers/auth'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Chat', icon: '💬' },
  { href: '/approvals', label: 'Pending Approvals', icon: '⏳' },
  { href: '/transactions', label: 'History', icon: '📋' },
  { href: '/analytics', label: 'Analytics', icon: '📊' },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user } = useAuth()

  if (!user) return null

  return (
    <aside className="hidden w-64 flex-col border-r border-zinc-200 bg-white/60 p-4 dark:border-zinc-800 dark:bg-zinc-900/50 md:flex">
      <div className="mb-6">
        <h2 className="text-sm font-semibold tracking-tight">Family Finance</h2>
        <p className="mt-1 text-xs text-zinc-500">AI-powered accounting</p>
      </div>

      <nav className="space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <a
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors ${
                active
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                  : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </a>
          )
        })}
      </nav>

      <div className="mt-auto">
        <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-xs font-medium">Signed in as</p>
          <p className="mt-1 text-sm font-semibold">{user.name}</p>
          <p className="text-xs text-zinc-500 capitalize">{user.role}</p>
        </div>
      </div>
    </aside>
  )
}
