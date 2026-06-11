'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/auth'
import { UserRole } from '@/types'
import { MoreVertical, MessageSquare, Clock, BarChart2, CheckSquare, LogOut, ChevronRight } from 'lucide-react'

const USERS: { role: UserRole; label: string; initials: string }[] = [
  { role: 'father', label: 'Father', initials: 'FA' },
  { role: 'brother', label: 'Brother', initials: 'BR' },
  { role: 'me', label: 'Me', initials: 'ME' },
]

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Chat', icon: MessageSquare },
  { href: '/approvals', label: 'Pending Approvals', icon: CheckSquare },
  { href: '/transactions', label: 'History', icon: Clock },
  { href: '/analytics', label: 'Analytics', icon: BarChart2 },
]

function roleInitials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function roleColor(role: string) {
  const colors: Record<string, string> = {
    father: '#5B8DEF',
    brother: '#25D366',
    me: '#FF6B35',
  }
  return colors[role] ?? '#128C7E'
}

export function TopBar() {
  const { user, refresh, logout } = useAuth()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [switcherOpen, setSwitcherOpen] = useState(false)

  const handleRoleSwitch = useCallback(
    async (role: UserRole) => {
      setOpen(false)
      setSwitcherOpen(false)
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

  const navigate = (href: string) => {
    setOpen(false)
    router.push(href)
  }

  if (!user) return null

  return (
    <header className="sticky top-0 z-50" style={{ backgroundColor: '#075E54' }}>
      <div className="flex h-14 items-center justify-between px-4">
        {/* Left: Avatar + Name */}
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white select-none"
            style={{ backgroundColor: roleColor(user.role) }}
          >
            {roleInitials(user.name)}
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold text-white">Family Finance</span>
            <span className="text-xs" style={{ color: '#9EEDE6' }}>
              {user.name} · {user.role}
            </span>
          </div>
        </div>

        {/* Right: Options */}
        <div className="relative">
          <button
            type="button"
            onClick={() => { setOpen((v) => !v); setSwitcherOpen(false) }}
            className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-white/10"
            aria-label="Options"
          >
            <MoreVertical size={20} className="text-white" />
          </button>

          {open && (
            <>
              {/* Backdrop */}
              <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setSwitcherOpen(false) }} />

              <div
                className="absolute right-0 top-11 z-50 w-52 overflow-hidden rounded-lg shadow-xl"
                style={{ backgroundColor: '#233138' }}
              >
                {/* Navigation items */}
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon
                  return (
                    <button
                      key={item.href}
                      type="button"
                      onClick={() => navigate(item.href)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-white transition-colors hover:bg-white/10"
                    >
                      <Icon size={16} className="shrink-0" style={{ color: '#9EEDE6' }} />
                      {item.label}
                    </button>
                  )
                })}

                {/* Divider */}
                <div className="my-1 border-t border-white/10" />

                {/* Switch User */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setSwitcherOpen((v) => !v)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm text-white transition-colors hover:bg-white/10"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
                        style={{ backgroundColor: roleColor(user.role) }}
                      >
                        {roleInitials(user.name)}
                      </div>
                      Switch User
                    </div>
                    <ChevronRight size={14} style={{ color: '#9EEDE6' }} />
                  </button>

                  {switcherOpen && (
                    <div
                      className="absolute right-full top-0 mr-1 w-40 overflow-hidden rounded-lg shadow-xl"
                      style={{ backgroundColor: '#233138' }}
                    >
                      {USERS.map((u) => (
                        <button
                          key={u.role}
                          type="button"
                          onClick={() => handleRoleSwitch(u.role)}
                          className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-white transition-colors hover:bg-white/10"
                        >
                          <div
                            className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white shrink-0"
                            style={{ backgroundColor: roleColor(u.role) }}
                          >
                            {u.initials}
                          </div>
                          <span className="flex-1">{u.label}</span>
                          {user.role === u.role && (
                            <span style={{ color: '#25D366', fontSize: 10 }}>✓</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Logout */}
                <div className="border-t border-white/10">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-white/10"
                    style={{ color: '#FF6B6B' }}
                  >
                    <LogOut size={16} className="shrink-0" />
                    Logout
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
