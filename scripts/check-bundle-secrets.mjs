// Fails if a secret could reach a browser:
//  1. scans built web bundles (folders given as arguments) for secret-looking values,
//     including Supabase JWTs whose role is not "anon" (e.g. service_role);
//  2. scans the apps' source for PUBLIC env vars whose name suggests a secret
//     (EXPO_PUBLIC_* / NEXT_PUBLIC_* are inlined into the bundle by design).
// Usage: node scripts/check-bundle-secrets.mjs <dist dir> [<dist dir> ...]
// Prints the file and the kind of finding only — never the value itself.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';

const TEXT_EXT = new Set(['.js', '.mjs', '.cjs', '.html', '.json', '.map', '.css', '.txt', '.webmanifest']);

const VALUE_PATTERNS = [
  ['Supabase secret key', /sb_secret_[A-Za-z0-9_-]{10,}/],
  ['Stripe secret key', /\b[sr]k_(live|test)_[A-Za-z0-9]{10,}/],
  ['Stripe webhook secret', /\bwhsec_[A-Za-z0-9]{10,}/],
  ['Anthropic API key', /\bsk-ant-[A-Za-z0-9_-]{20,}/],
  ['Google API key', /\bAIza[0-9A-Za-z_-]{30,}/],
  ['GitHub token', /\b(gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{20,})/],
  ['Resend API key', /\bre_[A-Za-z0-9]{6,}_[A-Za-z0-9]{16,}/],
  // Turnstile SECRET keys are 35 characters (site keys, which are public, are ~24): a secret pasted
  // into EXPO_PUBLIC_TURNSTILE_SITE_KEY would end up in the customer site.
  ['Cloudflare Turnstile secret key', /\b[0-9]x[0-9A-Za-z_-]{33}\b/],
  ['Google OAuth client secret', /\bGOCSPX-[A-Za-z0-9_-]{20,}/],
  ['Private key', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['Database URL with password', /postgres(ql)?:\/\/[^:\s"']+:[^@\s"']+@/],
];
const JWT = /eyJ[A-Za-z0-9_-]{10,}\.(eyJ[A-Za-z0-9_-]{10,})\.[A-Za-z0-9_-]{10,}/g;
const SECRET_NAME = /\b(EXPO_PUBLIC|NEXT_PUBLIC)_[A-Z0-9_]*(SECRET|SERVICE_ROLE|PRIVATE|PASSWORD|TOKEN)[A-Z0-9_]*\b/;

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.git') continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* walk(path);
    else yield path;
  }
}

function jwtRole(payloadPart) {
  try {
    return JSON.parse(Buffer.from(payloadPart, 'base64url').toString('utf8')).role ?? null;
  } catch {
    return null;
  }
}

const findings = [];
const dists = process.argv.slice(2);
if (dists.length === 0) {
  console.error('Usage: node scripts/check-bundle-secrets.mjs <dist dir> [...]');
  process.exit(2);
}

let scanned = 0;
for (const dist of dists) {
  for (const file of walk(dist)) {
    if (!TEXT_EXT.has(extname(file))) continue;
    const text = readFileSync(file, 'utf8');
    scanned++;
    for (const [kind, re] of VALUE_PATTERNS) if (re.test(text)) findings.push(`${file}: ${kind}`);
    for (const m of text.matchAll(JWT)) {
      const role = jwtRole(m[1]);
      if (role && role !== 'anon') findings.push(`${file}: Supabase JWT with role "${role}"`);
    }
  }
}

for (const app of ['apps/customer/src', 'apps/partner/src', 'apps/admin/src']) {
  let exists = true;
  try {
    statSync(app);
  } catch {
    exists = false;
  }
  if (!exists) continue;
  for (const file of walk(app)) {
    if (!/\.(ts|tsx|js|jsx|mjs)$/.test(file)) continue;
    const m = readFileSync(file, 'utf8').match(SECRET_NAME);
    if (m) findings.push(`${file}: public env var with a secret-looking name (${m[0]})`);
  }
}

if (findings.length) {
  console.error(`✗ ${findings.length} possible secret(s) reachable by browsers:`);
  for (const f of findings) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`✓ no secret found in ${scanned} bundle file(s) or in public env var names`);
