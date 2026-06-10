import { cookies } from 'next/headers'

const SESSION_COOKIE = 'finbot_session'
const SESSION_MAX_AGE = 60 * 60 * 24 * 7

export interface SessionPayload {
  userId: string
  username: string
  role: string
  name: string
}

export async function createSession(user: { id: string; username: string; role: string; name: string }) {
  const payload: SessionPayload = {
    userId: user.id,
    username: user.username,
    role: user.role,
    name: user.name,
  }
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, encoded, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
    secure: process.env.NODE_ENV === 'production',
  })
}

export async function destroySession() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
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

export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession()
  if (!session) {
    throw new Error('Unauthorized')
  }
  return session
}
