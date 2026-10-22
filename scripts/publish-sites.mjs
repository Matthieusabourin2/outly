// Builds the customer and staff websites for PRODUCTION and publishes them to Cloudflare Pages
// (direct upload with wrangler, after `npx wrangler login`). Never the Vercel CLI.
//
//   node scripts/publish-sites.mjs --ref <supabase project ref> --turnstile <site key> \
//     --privacy-email <address> [--only customer|staff] [--build-only] [--branch <name>]
//
// --branch <name> (not "main") publishes a PREVIEW at https://<name>.<project>.pages.dev and leaves
// the real sites untouched. Used by the production smoke test with Cloudflare's always-pass
// Turnstile TEST key (1x00000000000000000000AA), before the CAPTCHA is enforced in Supabase.
//
// - Supabase URL + publishable key come from scripts/prod-env.mjs (public values).
// - Local .env.local files are IGNORED (EXPO_NO_DOTENV): they point to this computer.
// - Each build must pass the bundle secret check and still point to the hosted project only.
// - Cloudflare projects: outly-customer, outly-staff (created on first run).
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const WRANGLER = 'wrangler@4.42.0';
const SITES = {
  customer: { app: 'apps/customer', project: 'outly-customer' },
  staff: { app: 'apps/partner', project: 'outly-staff' },
};

const args = {};
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--build-only') args.buildOnly = true;
  else if (a.startsWith('--')) args[a.slice(2)] = argv[++i];
}
const fail = (msg) => {
  console.error(`✋ ${msg}`);
  process.exit(2);
};
if (!/^[a-z0-9]{20}$/.test(args.ref ?? '')) fail('--ref <supabase project ref> is required.');
if (!/^[0-9]x[0-9A-Za-z_-]{20,24}$/.test(args.turnstile ?? '')) fail('--turnstile <Turnstile SITE key, e.g. 0x4AAAA…> is required (the public site key, never the secret).');
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(args['privacy-email'] ?? '')) fail('--privacy-email <address> is required.');
const only = args.only;
const branch = args.branch ?? 'main';
if (!/^[a-z0-9-]{1,28}$/.test(branch)) fail('--branch must be lower-case letters, digits or dashes.');
const TEST_KEY = '1x00000000000000000000AA';
if (args.turnstile === TEST_KEY && branch === 'main') fail('The Turnstile TEST key lets every robot through: never on the real sites (use --branch <preview>).');
if (only && !SITES[only]) fail('--only must be customer or staff.');

function run(cmd, cmdArgs, opts = {}) {
  const r = spawnSync(cmd, cmdArgs, { stdio: 'inherit', ...opts });
  if (r.status !== 0) fail(`${cmd} ${cmdArgs.slice(0, 3).join(' ')} … failed (exit ${r.status}).`);
  return r;
}

// Public values only.
const pub = spawnSync('node', ['scripts/prod-env.mjs', args.ref, '--public'], { encoding: 'utf8' });
if (pub.status !== 0) fail(`could not read the project's public values:\n${pub.stderr}`);
const env = Object.fromEntries(pub.stdout.trim().split('\n').map((l) => l.split(/=(.*)/s).slice(0, 2)));
const buildEnv = {
  ...process.env,
  EXPO_NO_DOTENV: '1',
  EXPO_PUBLIC_SUPABASE_URL: env.EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  EXPO_PUBLIC_TURNSTILE_SITE_KEY: args.turnstile,
  EXPO_PUBLIC_PRIVACY_EMAIL: args['privacy-email'],
  EXPO_PUBLIC_GOOGLE_SIGN_IN: 'off',
};

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* files(p);
    else if (/\.(js|html|json)$/.test(name)) yield p;
  }
}

for (const [name, site] of Object.entries(SITES)) {
  if (only && only !== name) continue;
  console.log(`\n== ${name}: build for ${env.EXPO_PUBLIC_SUPABASE_URL}`);
  run('pnpm', ['--filter', `@outly/${name === 'customer' ? 'customer' : 'partner'}`, 'build:web'], { env: buildEnv });
  const dist = join(site.app, 'dist');
  run('node', ['scripts/check-bundle-secrets.mjs', dist]);
  // The build must talk to the hosted project only: no local address may survive.
  let local = 0, hosted = 0;
  for (const f of files(dist)) {
    const t = readFileSync(f, 'utf8');
    if (/127\.0\.0\.1:54321|localhost:54321/.test(t)) local++;
    if (t.includes(env.EXPO_PUBLIC_SUPABASE_URL)) hosted++;
  }
  if (local || !hosted) fail(`${name}: the build still points to the local database (${local} file(s)) or not to ${env.EXPO_PUBLIC_SUPABASE_URL}.`);
  console.log(`✓ ${name}: points to the hosted project only`);
  if (args.buildOnly) continue;
  spawnSync('npx', ['-y', WRANGLER, 'pages', 'project', 'create', site.project, '--production-branch', 'main'], { stdio: 'ignore' });
  run('npx', ['-y', WRANGLER, 'pages', 'deploy', dist, '--project-name', site.project, '--branch', branch, '--commit-dirty=true']);
  if (branch !== 'main') console.log(`   preview: https://${branch}.${site.project}.pages.dev`);
}
run('node', ['scripts/check-csp-headers.mjs']);
console.log(args.buildOnly ? '\n✓ Builds ready (not published).' : '\n✓ Published. Custom domains: Cloudflare → Workers & Pages → <project> → Custom domains.');
