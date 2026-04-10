const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

async function test() {
  const res = await supabase.auth.getUser('["eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy", "test"]')
  console.log(res)
}
test()
