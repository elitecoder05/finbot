import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { createSession } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { role } = body as { role?: 'father' | 'brother' | 'me' }

    if (!role) {
      return NextResponse.json({ error: 'Role is required' }, { status: 400 })
    }

    const user = await prisma.user.findFirst({
      where: { role },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found for role' }, { status: 404 })
    }

    await createSession(user)

    return NextResponse.json({
      ok: true,
      user: { id: user.id, username: user.username, name: user.name, role: user.role },
    })
  } catch (error) {
    console.error('Role switch error:', error)
    return NextResponse.json({ error: 'Failed to switch role' }, { status: 500 })
  }
}
