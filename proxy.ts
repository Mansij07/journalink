import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { isOnboardingComplete, resolveGateRedirect } from '@/lib/authGate'
import { logger } from '@/lib/logger'

export async function proxy(request: NextRequest) {
  const response = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (c) => c.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        )
      }
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  let onboardingComplete = false
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, role')
      .eq('id', user.id)
      .single()
    onboardingComplete = isOnboardingComplete(profile, user)
  }

  const redirectTo = resolveGateRedirect({
    path,
    isAuthenticated: Boolean(user),
    onboardingComplete,
  })

  if (redirectTo) {
    logger.info('auth gate redirect', { path, redirectTo })
    return NextResponse.redirect(new URL(redirectTo, request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/feed/:path*',
    '/projects/:path*',
    '/profiles/:path*',
    '/notifications/:path*',
    '/applications/:path*',
    '/posts/:path*',
    '/login',
    '/signup',
    '/onboarding'
  ]
}
