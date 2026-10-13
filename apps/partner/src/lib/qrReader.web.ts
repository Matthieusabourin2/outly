/**
 * QR decoding on browsers without BarcodeDetector (Safari on iPhone, Firefox).
 *
 * expo-camera then loads the "barcode-detector" polyfill, which fetches its ZXing
 * WebAssembly (~1 MB) from the jsDelivr CDN at the first scan. At the door that means a
 * slow first scan on club 4G and a dependency on a third-party CDN. Instead:
 *  - the same file is served by the staff site itself (public/zxing/<version>/), and
 *  - it is downloaded as soon as the scanner opens, then handed to the polyfill from memory.
 * The CDN stays as a fallback if our copy is missing. The polyfill pins zxing-wasm, so the
 * URL only matches the exact version we host; any other version goes to the CDN untouched.
 */
export const ZXING_WASM_VERSION = '3.1.3';
const CDN_URL = `https://fastly.jsdelivr.net/npm/zxing-wasm@${ZXING_WASM_VERSION}/dist/reader/zxing_reader.wasm`;
export const SELF_HOSTED_URL = `/zxing/${ZXING_WASM_VERSION}/zxing_reader.wasm`;

let wasm: Promise<ArrayBuffer | null> | null = null;
let installed = false;
let originalFetch: typeof fetch | null = null;

function needsPolyfill(): boolean {
  return typeof window !== 'undefined' && typeof (globalThis as { BarcodeDetector?: unknown }).BarcodeDetector === 'undefined';
}

/** "\0asm": a hosting SPA fallback answers missing files with index.html and status 200. */
function isWasm(buffer: ArrayBuffer): boolean {
  const b = new Uint8Array(buffer, 0, Math.min(4, buffer.byteLength));
  return b.length === 4 && b[0] === 0x00 && b[1] === 0x61 && b[2] === 0x73 && b[3] === 0x6d;
}

async function download(f: typeof fetch, url: string): Promise<ArrayBuffer | null> {
  try {
    const res = await f(url, { credentials: 'same-origin' });
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    return isWasm(buffer) ? buffer : null;
  } catch {
    return null;
  }
}

function loadWasm(f: typeof fetch): Promise<ArrayBuffer | null> {
  wasm ??= (async () => (await download(f, SELF_HOSTED_URL)) ?? (await download(f, CDN_URL)))().then((buffer) => {
    if (!buffer) wasm = null; // let the next attempt try again
    return buffer;
  });
  return wasm;
}

function install() {
  if (installed) return;
  installed = true;
  originalFetch = window.fetch.bind(window);
  const f = originalFetch;
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (url !== CDN_URL) return f(input, init);
    return loadWasm(f).then((buffer) =>
      buffer ? new Response(buffer.slice(0), { status: 200, headers: { 'Content-Type': 'application/wasm' } }) : f(input, init),
    );
  };
}

/**
 * Call when a scanner opens. Resolves true when QR decoding is ready to work
 * (native BarcodeDetector, or the WebAssembly is in memory), false when it could not be
 * downloaded from either place (the scanner then asks to check the connection).
 */
export function prepareQrReader(): Promise<boolean> {
  if (!needsPolyfill()) return Promise.resolve(true);
  install();
  return loadWasm(originalFetch!).then((buffer) => buffer !== null);
}
