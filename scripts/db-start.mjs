// Starts the local Supabase stack.
// On Windows (Docker Desktop) the analytics, Studio and pg_meta containers never report healthy, which aborts
// `supabase start`. They are dev-only tools (the apps never call them), so they are skipped there.
import { spawnSync } from 'node:child_process';

const args = ['start'];
if (process.platform === 'win32') args.push('-x', 'logflare,vector,studio,postgres-meta');

const run = spawnSync(`supabase ${args.join(' ')}`, { stdio: 'inherit', shell: true });
process.exit(run.status ?? 1);
