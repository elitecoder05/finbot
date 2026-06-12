import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ user: null })
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { id: true, username: true, role: true, name: true, email: true, createdAt: true },
      })

      if (!user) {
        return NextResponse.json({ user: null })
      }

      return NextResponse.json({ user })
    } catch (dbError) {
      console.warn('Session DB lookup failed, returning cookie session data:', dbError)
      return NextResponse.json({
        user: {
          id: session.userId,
          username: session.username,
          role: session.role,
          name: session.name,
          email: null,
          createdAt: new Date().toISOString(),
        },
      })
    }
  } catch (error) {
    console.error('Session check error:', error)
    return NextResponse.json({ error: 'Failed to check session' }, { status: 500 })
  }
}
