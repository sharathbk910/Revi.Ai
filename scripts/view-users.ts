import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://mzgjgncslmuddeocygjz.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  console.error('\n❌ ERROR: SUPABASE_SERVICE_ROLE_KEY is missing in your .env file.\n');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function main() {
  console.log('\n======================================================');
  console.log('REVISIONLY // SUPABASE USER DETAILS INSPECTOR');
  console.log(`Target: ${supabaseUrl}`);
  console.log('======================================================\n');

  try {
    // 1. Fetch all registered users from auth.users via Admin API
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();

    if (authError) {
      console.error('❌ Failed to fetch auth users:', authError.message);
      process.exit(1);
    }

    const users = authData.users || [];
    console.log(`📊 Total Registered Users in Auth: ${users.length}\n`);

    if (users.length === 0) {
      console.log('ℹ️  No users have signed up yet on https://revi-ai-rho.vercel.app/');
      console.log('   When users register with email/password or Google OAuth,');
      console.log('   their complete profiles and metadata will appear here.\n');
      return;
    }

    // 2. Try fetching public profiles if migration has been executed
    let profilesMap: Record<string, any> = {};
    try {
      const { data: profiles, error: profError } = await supabaseAdmin
        .from('profiles')
        .select('*');

      if (!profError && profiles) {
        for (const p of profiles) {
          profilesMap[p.user_id] = p;
        }
      }
    } catch {
      // profiles table might not be migrated yet
    }

    // 3. Format and display each user
    console.log('------------------------------------------------------------------------------------------------------------------------');
    console.log(
      '#'.padEnd(4) +
      'EMAIL'.padEnd(30) +
      'DISPLAY NAME'.padEnd(22) +
      'PROVIDER'.padEnd(12) +
      'CREATED AT'.padEnd(24) +
      'LAST SIGN IN'
    );
    console.log('------------------------------------------------------------------------------------------------------------------------');

    users.forEach((u, index) => {
      const profile = profilesMap[u.id];
      const displayName = profile?.display_name || u.user_metadata?.full_name || u.user_metadata?.name || '-';
      const provider = u.app_metadata?.provider || 'email';
      const createdAt = u.created_at ? new Date(u.created_at).toLocaleString() : '-';
      const lastSignIn = u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString() : 'Never';

      console.log(
        String(index + 1).padEnd(4) +
        (u.email || 'No email').padEnd(30) +
        String(displayName).padEnd(22) +
        String(provider).padEnd(12) +
        createdAt.padEnd(24) +
        lastSignIn
      );
      console.log(`     └─ UID: ${u.id} | Confirmed: ${u.email_confirmed_at ? 'Yes' : 'No'}`);
    });

    console.log('------------------------------------------------------------------------------------------------------------------------\n');
  } catch (err: any) {
    console.error('❌ Unexpected error inspecting users:', err.message || err);
  }
}

main();
