import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db/client'

const SESSION_COOKIE = 'finbot_session'
const SESSION_MAX_AGE = 60 * 60 * 24 * 7

const DEFAULT_USERS = [
  { username: 'father', password: 'password123', role: 'father', name: 'Father' },
  { username: 'brother', password: 'password123', role: 'brother', name: 'Brother' },
  { username: 'me', password: 'password123', role: 'me', name: 'Me' },
] as const

export interface SessionPayload {
  userId: string
  username: string
  role: string
  name: string
}

export function encodeSession(user: { id: string; username: string; role: string; name: string }): string {
  const payload: SessionPayload = {
    userId: user.id,
    username: user.username,
    role: user.role,
    name: user.name,
  }
  return Buffer.from(JSON.stringify(payload)).toString('base64url')
}

export function setSessionCookie(response: NextResponse, encoded: string) {
  response.cookies.set(SESSION_COOKIE, encoded, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
    secure: process.env.NODE_ENV === 'production',
  })
  return response
}

export function destroySession(response: NextResponse) {
  response.cookies.delete(SESSION_COOKIE)
  return response
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const cookie = cookieStore.get(SESSION_COOKIE)?.value
  if (!cookie) return null
  try {
    return JSON.parse(Buffer.from(cookie, 'base64url').toString('utf8')) as SessionPayload
  } catch {
    return null
  }
}

export function getDefaultUser(username: string, password: string) {
  return DEFAULT_USERS.find((user) => user.username === username && user.password === password) ?? null
}

export async function ensureDefaultUsers() {
  try {
    const existingUsers = await prisma.user.count()

    if (existingUsers > 0) {
      return
    }

    const passwordHash = await bcrypt.hash('password123', 10)

    await prisma.user.createMany({
      data: DEFAULT_USERS.map((user) => ({
        username: user.username,
        passwordHash,
        role: user.role,
        name: user.name,
        email: `${user.username}@example.com`,
      })),
    })
  } catch (error) {
    console.warn('Default user initialization skipped:', error)
  }
}

export async function findUserForLogin(username: string, password: string) {
  try {
    await ensureDefaultUsers()

    const user = await prisma.user.findUnique({
      where: { username },
    })

    if (user && (await bcrypt.compare(password, user.passwordHash))) {
      return user
    }
  } catch (error) {
    console.warn('Database login lookup failed, using fallback credentials:', error)
  }

  return getDefaultUser(username, password)
    ? {
        id: `default-${username}`,
        username,
        role: getDefaultUser(username, password)!.role,
        name: getDefaultUser(username, password)!.name,
      }
    : null
}

export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession()
  if (!session || !session.userId) {
    throw new Error('Unauthorized')
  }

  if (session.userId.startsWith('default-')) {
    const username = session.userId.slice('default-'.length)
    const dbUser = await prisma.user.findUnique({
      where: { username },
      select: { id: true, username: true, role: true, name: true },
    }).catch(() => null)

    if (dbUser) {
      const cookieStore = await cookies()
      cookieStore.set(SESSION_COOKIE, encodeSession(dbUser), {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: SESSION_MAX_AGE,
        secure: process.env.NODE_ENV === 'production',
      })
      return {
        userId: dbUser.id,
        username: dbUser.username,
        role: dbUser.role,
        name: dbUser.name,
      }
    }
  }

  return session
}
