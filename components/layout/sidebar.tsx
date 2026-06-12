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
    <aside className="hidden w-64 flex-col border-r bg-white p-4 md:flex" style={{ borderColor: '#e5e7eb' }}>
      <div className="mb-6">
        <h2 className="text-sm font-semibold tracking-tight" style={{ color: '#111827' }}>Family Finance</h2>
        <p className="mt-1 text-xs" style={{ color: '#6b7280' }}>AI-powered accounting</p>
      </div>

      <nav className="space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <a
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors"
              style={active
                ? { backgroundColor: '#ecfdf5', color: '#047857' }
                : { color: '#4b5563' }
              }
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </a>
          )
        })}
      </nav>

      <div className="mt-auto">
        <div className="rounded-xl border bg-white p-3" style={{ borderColor: '#e5e7eb' }}>
          <p className="text-xs font-medium" style={{ color: '#374151' }}>Signed in as</p>
          <p className="mt-1 text-sm font-semibold" style={{ color: '#111827' }}>{user.name}</p>
          <p className="text-xs capitalize" style={{ color: '#6b7280' }}>{user.role}</p>
        </div>
      </div>
    </aside>
  )
}
