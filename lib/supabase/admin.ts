import "server-only"
import { createClient } from "@supabase/supabase-js"

/**
 * Privileged Supabase client backed by the service-role key. Bypasses RLS, so
 * it must NEVER be imported into client code. Used for password resets where we
 * change a user's password without an authenticated session.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
