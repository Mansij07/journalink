import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
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

  if (!user) {
    // Not logged in → only allow login, signup, auth routes
    if (!path.startsWith('/login') && !path.startsWith('/signup') && !path.startsWith('/auth')) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return response
  }

  // User is logged in → check if onboarding is complete
  const { data: profile } = await supabase
    .from('profiles')
    .select('username, role')
    .eq('id', user.id)
    .single()

  // Check if user is OAuth (no email provider)
  const isOAuthUser = user.app_metadata?.provider !== 'email'

  const onboardingComplete = profile && (
    !isOAuthUser || // email users skip onboarding
    (profile.username !== user.email?.split('@')[0] && profile.role !== null)
  )

  if (!onboardingComplete && !path.startsWith('/onboarding') && !path.startsWith('/auth')) {
    // Logged in but onboarding not done → go to onboarding
    return NextResponse.redirect(new URL('/onboarding', request.url))
  }

  if (onboardingComplete && (path.startsWith('/login') || path.startsWith('/signup') || path.startsWith('/onboarding'))) {
    // Onboarding done → don't let them go back to login/signup/onboarding
    return NextResponse.redirect(new URL('/feed', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/feed/:path*',
    '/projects/:path*',
    '/profile/:path*',
    '/notifications/:path*',
    '/applications/:path*',
    '/posts/:path*',
    '/login',
    '/signup',
    '/onboarding',
  ]
}