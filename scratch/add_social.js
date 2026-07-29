const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');
const envConfig = dotenv.parse(fs.readFileSync('.env.local'));

const supabase = createClient(envConfig.NEXT_PUBLIC_SUPABASE_URL, envConfig.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  await supabase.from('store_profiles').update({
    social_instagram: 'sercoplas',
    social_facebook: 'https://facebook.com/sercoplas'
  }).eq('slug', 'sercoplas');
  console.log('Socials added');
}
run();
