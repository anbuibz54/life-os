/**
 * Session refresh and optimistic auth redirects.
 *
 * NOTE: this file is `proxy.ts`, not `middleware.ts`. The `middleware` file
 * convention is deprecated in Next.js 16 and renamed to `proxy`. Every Supabase
 * auth guide still shows `middleware.ts` with an exported `middleware`
 * function; that form no longer applies here.
 *
 * Two jobs, in order of importance:
 *
 *  1. Refresh the auth token and write the rotated cookie. Server Components
 *     cannot set cookies, so without this the session would quietly expire and
 *     `src/lib/supabase/server.ts` would swallow the resulting error.
 *
 *  2. Redirect signed-out visitors to /login. This is an OPTIMISTIC check and
 *     is not a security boundary — proxy runs on prefetched routes and should
 *     stay cheap. Real authorization happens in the data access layer, next to
 *     the data. See `src/lib/auth/dal.ts`.
 */

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

/**
 * Prefixes reachable while signed out. Everything else requires a session.
 *
 * `/design` is the component gallery. Safe to list because the page itself
 * returns 404 in production — signing in to look at swatches would be friction
 * for no gain in development.
 *
 * `/api/mcp` authenticates with a bearer token, not a cookie. Redirecting an
 * MCP client to an HTML login page would turn a clear 401 into a confusing
 * 200, so this proxy must not touch it.
 */
const PUBLIC_PREFIXES = ['/login', '/signup', '/auth', '/design', '/api/mcp']

function isPublic(pathname: string) {
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Written to the request so this pass sees the fresh token, and to a
          // rebuilt response so the browser is told about it.
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value)
          }
          response = NextResponse.next({ request })
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options)
          }
        },
      },
    },
  )

  // `getUser()`, not `getSession()`. getSession reads the cookie without
  // verifying it, so it will happily report a user from a forged or expired
  // token. getUser revalidates against the auth server and is what triggers
  // the refresh this proxy exists to persist.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  if (!user && !isPublic(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    // Remember where they were headed so login can send them back.
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  if (user && (pathname === '/login' || pathname === '/signup')) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  // Skip static assets and image optimisation. Auth-relevant routes only —
  // proxy running on every prefetched image is pure latency.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
