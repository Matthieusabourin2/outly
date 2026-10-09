// Creates demo accounts on the LOCAL Supabase (Auth admin API) for testing every role.
// Refuses to run against anything but 127.0.0.1 / localhost: never point it at production.
// Usage: pnpm db:seed-users  (after pnpm db:reset)
import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const PASSWORD = 'OutlyDemo2026!';
const VELVET_TRAM = '00000000-0000-4000-a000-000000000002'; // demo venue hosting the demo launch night

const ACCOUNTS = [
  { email: 'admin@demo.outly', username: 'demo_admin', name: 'Demo Admin', outlyRole: 'outly_admin' },
  { email: 'manager@demo.outly', username: 'demo_manager', name: 'Demo Manager', venueRole: 'venue_manager' },
  { email: 'door@demo.outly', username: 'demo_door', name: 'Demo Door', venueRole: 'venue_door' },
  { email: 'bar@demo.outly', username: 'demo_bar', name: 'Demo Bar', venueRole: 'venue_staff' },
  { email: 'guest@demo.outly', username: 'demo_guest', name: 'Demo Guest' },
];

const status = JSON.parse(
  execFileSync('supabase', ['status', '-o', 'json'], { encoding: 'utf8', shell: process.platform === 'win32' }),
);
const url = status.API_URL;
const serviceKey = status.SECRET_KEY ?? status.SERVICE_ROLE_KEY;
if (!url || !/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(url)) {
  console.error(`Refusing to seed users: ${url ?? 'no URL'} is not a local Supabase.`);
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

async function findUserId(email) {
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  return data.users.find((u) => u.email === email)?.id ?? null;
}

for (const acc of ACCOUNTS) {
  let id = await findUserId(acc.email);
  if (!id) {
    const { data, error } = await admin.auth.admin.createUser({ email: acc.email, password: PASSWORD, email_confirm: true });
    if (error) throw error;
    id = data.user.id;
  }
  const { error: pErr } = await admin
    .from('profiles')
    .upsert({ id, username: acc.username, display_name: acc.name, date_of_birth: '1995-01-01' });
  if (pErr) throw pErr;
  if (acc.outlyRole) {
    const { error } = await admin.from('outly_staff').upsert({ user_id: id, role: acc.outlyRole });
    if (error) throw error;
  }
  if (acc.venueRole) {
    const { error } = await admin
      .from('venue_memberships')
      .upsert({ user_id: id, venue_id: VELVET_TRAM, role: acc.venueRole });
    if (error) throw error;
  }
  console.log(`✓ ${acc.email.padEnd(20)} ${acc.outlyRole ?? acc.venueRole ?? 'customer'}`);
}
console.log(`\nAll demo accounts use the password: ${PASSWORD}  (local only)`);
