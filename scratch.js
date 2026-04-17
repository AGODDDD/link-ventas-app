const { createClient } = require('@supabase/supabase-js')
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
async function go() {
    const { data: users, error } = await supabase.from('profiles').select('*').limit(5)
    console.log(users)
}
go()
