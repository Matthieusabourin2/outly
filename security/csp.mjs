// Content-Security-Policy for the two Expo websites (customer + staff).
// Single source of truth: docs/SECURITY.md § CSP explains them; the hosting files
// (public/_headers, vercel.json) carry the same strings; security/csp-test.mjs proves
// them in Chrome on the exported sites (pnpm security:csp).
//
// Each directive is listed with WHY it is there. Anything not listed falls back to
// default-src 'self' (same origin only).

/** Supabase project origins. Narrow to the exact project once it exists (see buildCsp). */
const SUPABASE = ['https://*.supabase.co', 'wss://*.supabase.co'];

/** Cloudflare Turnstile (bot check on the customer sign-in page): its script and its iframe. */
const TURNSTILE = 'https://challenges.cloudflare.com';

/**
 * QR reader fallback for browsers without a native BarcodeDetector (iPhone Safari, Firefox):
 * expo-camera → barcode-detector → zxing-wasm downloads this exact WebAssembly file.
 * Pinned to the exact file and version (a CSP source can include a path).
 * Bump it together with zxing-wasm (pnpm-lock.yaml), or self-host the file (docs/SECURITY.md).
 */
export const ZXING_WASM_URL = 'https://fastly.jsdelivr.net/npm/zxing-wasm@3.1.3/dist/reader/zxing_reader.wasm';

const COMMON = {
  // Everything not listed below: same origin only.
  'default-src': ["'self'"],
  // The site's own JS bundle only: no inline script, no eval.
  'script-src': ["'self'"],
  // React Native Web writes component styles at runtime (style elements and style
  // attributes), and Expo's index.html has an inline reset <style>: 'unsafe-inline' is
  // needed for styles. CSS cannot run script, so the XSS protection stays in script-src.
  'style-src': ["'self'", "'unsafe-inline'"],
  // Own images and icons; data:/blob: for generated images (QR code, favicons, icon fonts).
  'img-src': ["'self'", 'data:', 'blob:'],
  // Plus Jakarta Sans and Ionicons are bundled with the site (no Google Fonts request).
  'font-src': ["'self'"],
  // Supabase REST / Auth / Edge Functions (https) and Realtime (wss).
  'connect-src': ["'self'", ...SUPABASE],
  // No iframes on the page unless listed per site.
  'frame-src': ["'none'"],
  // No <object>/<embed> (old plugin XSS vector).
  'object-src': ["'none'"],
  // An injected <base href> cannot redirect the site's relative script URLs.
  'base-uri': ["'self'"],
  // Forms may only post to the site itself (the app does not use HTML form posts).
  'form-action': ["'self'"],
  // Nobody may frame the site (clickjacking). Header-only directive.
  'frame-ancestors': ["'none'"],
};

const CUSTOMER = {
  ...COMMON,
  // Turnstile's loader script.
  'script-src': ["'self'", TURNSTILE],
  // Turnstile renders its challenge in an iframe served by Cloudflare.
  'frame-src': [TURNSTILE],
  // The customer site never uses the camera or plays media.
  'media-src': ["'none'"],
};

const STAFF = {
  ...COMMON,
  // 'wasm-unsafe-eval' lets the page compile WebAssembly (the QR reader fallback) without
  // allowing JavaScript eval().
  'script-src': ["'self'", "'wasm-unsafe-eval'"],
  // + the QR reader's WebAssembly file (fetched with fetch()).
  'connect-src': [...COMMON['connect-src'], ZXING_WASM_URL],
  // Camera preview: a MediaStream in a <video>, blob: for frames.
  'media-src': ["'self'", 'blob:', 'mediastream:'],
};

function serialise(policy) {
  return Object.entries(policy)
    .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
    .join('; ');
}

/** Production policy for the customer site (outly … /sign-in, Night, Pass, Profile). */
export const CUSTOMER_CSP = serialise(CUSTOMER);
/** Production policy for the staff site (door scanner, bar, Tonight). */
export const STAFF_CSP = serialise(STAFF);

/**
 * Same policy, with Supabase pinned to one origin instead of *.supabase.co
 * (recommended once the production project exists: e.g. https://abcd1234.supabase.co),
 * or pointed at the local API for tests (http://127.0.0.1:54321).
 * @param {'customer' | 'staff'} site
 * @param {{ supabaseUrl: string }} options
 */
export function buildCsp(site, { supabaseUrl }) {
  const url = new URL(supabaseUrl);
  const ws = `${url.protocol === 'https:' ? 'wss:' : 'ws:'}//${url.host}`;
  const base = site === 'customer' ? CUSTOMER : STAFF;
  const connect = base['connect-src'].filter((s) => !SUPABASE.includes(s));
  return serialise({ ...base, 'connect-src': ["'self'", url.origin, ws, ...connect.filter((s) => s !== "'self'")] });
}

export const POLICIES = { customer: CUSTOMER, staff: STAFF };

// `node security/csp.mjs` prints both policies (to paste into _headers / vercel.json).
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(`Customer site:\nContent-Security-Policy: ${CUSTOMER_CSP}\n`);
  console.log(`Staff site:\nContent-Security-Policy: ${STAFF_CSP}`);
}
