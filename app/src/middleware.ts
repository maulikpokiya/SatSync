import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Routes accessible without authentication
const PUBLIC_PATHS = new Set(['/login', '/auth/callback'])

// Pattern for public event pages (e.g. /events/some-slug and /events/some-slug/register)
const PUBLIC_EVENT_PATTERN = /^\/events\/[^/]+(\/register)?$/

// Routes that require super_admin role
const ADMIN_PATTERN = /^\/admin/

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const { supabaseResponse, user } = await updateSession(request)

  const isPublicPath =
    PUBLIC_PATHS.has(pathname) ||
    PUBLIC_EVENT_PATTERN.test(pathname) ||
    pathname === '/'

  // Redirect unauthenticated users to /login
  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from /login
  if (user && pathname === '/login') {
    const next = request.nextUrl.searchParams.get('next') ?? '/dashboard'
    const url = request.nextUrl.clone()
    url.pathname = next
    url.search = ''
    return NextResponse.redirect(url)
  }

  // For admin routes, role check happens in the page/layout server component
  // (middleware cannot query Supabase data without hitting the DB on every request).
  // The page will redirect to /dashboard if the user doesn't have the required role.

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
