// Writes apps/*/.env.local from the running local Supabase (`supabase status`).
// Local dev only: these are the CLI's well-known local keys, never hosted-project values.
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const status = JSON.parse(execFileSync('supabase', ['status', '-o', 'json'], { encoding: 'utf8', shell: process.platform === 'win32' }));
const url = status.API_URL;
const key = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
if (!url || !key) {
  console.error('Could not read API_URL / PUBLISHABLE_KEY from `supabase status`. Is it running?');
  process.exit(1);
}

const files = {
  'apps/customer/.env.local': `EXPO_PUBLIC_SUPABASE_URL=${url}\nEXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${key}\n`,
  'apps/partner/.env.local': `EXPO_PUBLIC_SUPABASE_URL=${url}\nEXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${key}\n`,
  'apps/admin/.env.local': `NEXT_PUBLIC_SUPABASE_URL=${url}\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${key}\n`,
};
for (const [path, content] of Object.entries(files)) {
  writeFileSync(path, content);
  console.log(`wrote ${path}`);
}
