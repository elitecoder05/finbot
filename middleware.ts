import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const session = request.cookies.get('finbot_session')?.value
  const { pathname } = request.nextUrl

  const isAuthRoute = pathname === '/login'
  const isProtectedAppRoute = pathname.startsWith('/dashboard') || pathname.startsWith('/approvals') || pathname.startsWith('/transactions')
  const isApiAuthRoute = pathname.startsWith('/api/auth')

  if (isApiAuthRoute) {
    return NextResponse.next()
  }

  if (isProtectedAppRoute) {
    if (!session) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('next', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  if (isAuthRoute && session) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/approvals/:path*', '/transactions/:path*', '/login', '/api/auth/:path*'],
}
