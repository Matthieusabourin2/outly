// Runs a command against the HOSTED Supabase project without the secret key ever being printed,
// pasted or written to a file: the key is fetched with the Supabase CLI (after `supabase login`)
// and handed to the command through its environment only.
//
//   node scripts/prod-env.mjs <project-ref> -- <command> [args...]
//     sets SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (for pnpm rouge:setup / rouge:staff --target prod)
//   node scripts/prod-env.mjs <project-ref> --public
//     prints the project URL and the PUBLISHABLE key (public by design: it ships in the websites)
//
// Never prints the secret key. The child command must not print its environment either.
import { spawnSync } from 'node:child_process';

const [ref, sep, ...cmd] = process.argv.slice(2);
if (!/^[a-z0-9]{20}$/.test(ref ?? '')) {
  console.error('Usage: node scripts/prod-env.mjs <project-ref (20 letters/digits)> -- <command...> | --public');
  process.exit(2);
}

const res = spawnSync('supabase', ['projects', 'api-keys', '--project-ref', ref, '--reveal', '-o', 'json'], { encoding: 'utf8' });
if (res.status !== 0) {
  console.error('Could not read the project keys. Run `supabase login` first, and check the project ref.');
  process.exit(2);
}
let keys;
try {
  keys = JSON.parse(res.stdout);
} catch {
  console.error('Unexpected answer from `supabase projects api-keys` (not JSON).');
  process.exit(2);
}
const list = Array.isArray(keys) ? keys : (keys.keys ?? []);
const value = (k) => k.api_key ?? k.key ?? '';
const secret = list.find((k) => k.type === 'secret' && value(k).startsWith('sb_secret_')) ?? list.find((k) => k.name === 'service_role');
const publishable = list.find((k) => k.type === 'publishable' && value(k).startsWith('sb_publishable_')) ?? list.find((k) => k.name === 'anon');
const url = `https://${ref}.supabase.co`;

if (sep === '--public') {
  if (!publishable) {
    console.error('No publishable key found on this project.');
    process.exit(2);
  }
  console.log(`EXPO_PUBLIC_SUPABASE_URL=${url}`);
  console.log(`EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${value(publishable)}`);
  process.exit(0);
}
if (sep !== '--' || cmd.length === 0) {
  console.error('Usage: node scripts/prod-env.mjs <project-ref> -- <command...> | --public');
  process.exit(2);
}
if (!secret) {
  console.error('No secret / service_role key found on this project.');
  process.exit(2);
}
const run = spawnSync(cmd[0], cmd.slice(1), {
  stdio: 'inherit',
  env: { ...process.env, SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: value(secret) },
});
process.exit(run.status ?? 1);
