// Fails if the websites' Content-Security-Policy drifts from security/csp.mjs (the tested policy),
// or if the policy itself loses one of its safety properties.
//  1. Safety properties of both policies (no inline/eval script, no plugins, no framing…).
//  2. Every hosting file that exists (apps/<site>/public/_headers, apps/<site>/vercel.json)
//     must carry exactly that site's policy — either with *.supabase.co, or pinned to one
//     project (https://<ref>.supabase.co), as produced by buildCsp().
//  3. The QR reader's WebAssembly URL allowed by the staff policy matches the zxing-wasm
//     version actually installed (a silent bump would break scanning on iPhones only).
// Usage: node scripts/check-csp-headers.mjs
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { CUSTOMER_CSP, POLICIES, STAFF_CSP, ZXING_WASM_URL, buildCsp } from '../security/csp.mjs';

const problems = [];

// 1. Safety properties
for (const [site, p] of Object.entries(POLICIES)) {
  const script = p['script-src'] ?? [];
  for (const bad of ["'unsafe-inline'", "'unsafe-eval'", "'strict-dynamic'", '*', 'http:', 'https:', 'data:', 'blob:']) {
    if (script.includes(bad)) problems.push(`${site}: script-src must not contain ${bad}`);
  }
  const must = { 'object-src': "'none'", 'frame-ancestors': "'none'", 'base-uri': "'self'", 'form-action': "'self'", 'default-src': "'self'" };
  for (const [d, v] of Object.entries(must)) {
    if ((p[d] ?? []).join(' ') !== v) problems.push(`${site}: ${d} must be exactly ${v}`);
  }
}

// 2. Hosting files
const SITES = { customer: { dir: 'apps/customer', csp: CUSTOMER_CSP }, staff: { dir: 'apps/partner', csp: STAFF_CSP } };
const CSP_IN_FILE = /Content-Security-Policy"?\s*[:,]\s*(?:"value"\s*:\s*)?"?([^"\n]+)/gi;
let files = 0;
for (const [site, { dir, csp }] of Object.entries(SITES)) {
  for (const file of [`${dir}/public/_headers`, `${dir}/vercel.json`]) {
    // Both hosts' files must exist: a deleted file would silently ship a site without its CSP.
    if (!existsSync(file)) {
      problems.push(`${file}: missing (each site needs both hosting files, with the ${site} policy from security/csp.mjs)`);
      continue;
    }
    files++;
    const values = [...readFileSync(file, 'utf8').matchAll(CSP_IN_FILE)].map((m) => m[1].trim());
    if (values.length === 0) {
      problems.push(`${file}: no Content-Security-Policy header (expected the ${site} policy from security/csp.mjs)`);
      continue;
    }
    for (const value of values) {
      if (value === csp) continue;
      const pinned = value.match(/connect-src [^;]*?(https:\/\/[a-z0-9]+\.supabase\.co)\b/);
      if (pinned && value === buildCsp(site, { supabaseUrl: pinned[1] })) continue;
      problems.push(`${file}: Content-Security-Policy differs from the ${site} policy in security/csp.mjs (run: node security/csp.mjs)`);
    }
  }
}

// 3. zxing-wasm version (apps/partner → expo-camera → barcode-detector → zxing-wasm)
let zxing = '?';
try {
  const fromPartner = createRequire(resolve('apps/partner/package.json'));
  const fromCamera = createRequire(fromPartner.resolve('expo-camera/package.json'));
  const fromDetector = createRequire(fromCamera.resolve('barcode-detector'));
  let dir = dirname(fromDetector.resolve('zxing-wasm'));
  while (!existsSync(join(dir, 'package.json')) || JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).name !== 'zxing-wasm') {
    if (dir === dirname(dir)) throw new Error('zxing-wasm package.json not found');
    dir = dirname(dir);
  }
  const { version } = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  zxing = version;
  const share = readFileSync(join(dir, 'dist/es/share.js'), 'utf8');
  const cdn = share.match(/https:\/\/[a-z.]+\/npm\/zxing-wasm@[0-9.]+\/dist\//)?.[0];
  if (!cdn || !ZXING_WASM_URL.startsWith(cdn) || !ZXING_WASM_URL.includes(`zxing-wasm@${version}/`)) {
    problems.push(`staff CSP allows ${ZXING_WASM_URL} but the installed QR reader (zxing-wasm ${version}) loads from ${cdn ?? '?'}: update ZXING_WASM_URL in security/csp.mjs`);
  }
} catch (e) {
  problems.push(`could not check the zxing-wasm version (${e.message}); run pnpm install`);
}

if (problems.length) {
  console.error(`✗ ${problems.length} CSP problem(s):`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(`✓ CSP policies keep their safety properties; ${files} hosting file(s) carry the tested policy; QR reader URL matches zxing-wasm ${zxing}`);
