import { createClient } from 'npm:@supabase/supabase-js'

const supabaseUrl = Deno.env.get('EXTERNAL_SUPABASE_URL')
const supabaseKey = Deno.env.get('EXTERNAL_SUPABASE_SERVICE_ROLE_KEY')

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing external Supabase credentials')
  Deno.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
  // Use a generic query to see if we can list tables via RPC if available
  // Or just try to select from a common table like 'profiles'
  const { data, error } = await supabase.from('profiles').select('count', { count: 'exact', head: true })
  if (error) {
    console.log('Error or table profiles does not exist:', error.message)
  } else {
    console.log('Table profiles exists. Row count:', data)
  }
}

test()
