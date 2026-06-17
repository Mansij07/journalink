import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { 
        getAll: () => cookieStore.getAll(),
        setAll: (c) => c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) 
      }}
    )

    await supabase.auth.exchangeCodeForSession(code)
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, role')
        .eq('id', user.id)
        .single()

      // If username is just email prefix (set by trigger), go to onboarding
      if (!profile || profile.username === user.email?.split('@')[0]) {
        return NextResponse.redirect(new URL('/onboarding', request.url))
      }
    }
  }

  return NextResponse.redirect(new URL('/feed', request.url))
}