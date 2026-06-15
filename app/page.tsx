import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('post').select('*')
  console.log(data, error)
  return <div>Check terminal for output</div>
}