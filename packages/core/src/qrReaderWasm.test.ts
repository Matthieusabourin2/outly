import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * The staff site serves the ZXing WebAssembly used by expo-camera's barcode-detector polyfill
 * (Safari has no BarcodeDetector), see apps/partner/src/lib/qrReader.web.ts. If an upgrade
 * changes the zxing-wasm version, our copy would be silently skipped (CDN fallback): fail here.
 */
const root = fileURLToPath(new URL('../../../', import.meta.url));
const pnpmDir = `${root}node_modules/.pnpm/`;
const findPackage = (name: string) =>
  existsSync(pnpmDir) ? readdirSync(pnpmDir).filter((d) => d.startsWith(`${name}@`)).map((d) => `${pnpmDir}${d}/node_modules/${name}`) : [];

describe('self-hosted QR decoder (staff site)', () => {
  const polyfills = findPackage('barcode-detector');
  it.skipIf(polyfills.length === 0)('matches the zxing-wasm version and file the polyfill loads', () => {
    const source = readFileSync(`${root}apps/partner/src/lib/qrReader.web.ts`, 'utf8');
    const hosted = source.match(/ZXING_WASM_VERSION = '([\d.]+)'/)?.[1];
    for (const dir of polyfills) {
      const wanted = JSON.parse(readFileSync(`${dir}/package.json`, 'utf8')).dependencies['zxing-wasm'];
      expect(wanted, `${dir} pins zxing-wasm ${wanted}, qrReader.web.ts hosts ${hosted}`).toBe(hosted);
    }
    const ours = readFileSync(`${root}apps/partner/public/zxing/${hosted}/zxing_reader.wasm`);
    const upstream = findPackage('zxing-wasm').find((d) => d.includes(`zxing-wasm@${hosted}`));
    expect(upstream).toBeDefined();
    const sha = (b: Buffer) => createHash('sha256').update(b).digest('hex');
    const theirs = readFileSync(`${upstream}/dist/reader/zxing_reader.wasm`);
    expect(sha(ours)).toBe(sha(theirs));
    // The browser only accepts the file whose size and SHA-256 are written in qrReader.web.ts.
    expect(source.match(/ZXING_WASM_SHA256 = '([0-9a-f]{64})'/)?.[1]).toBe(sha(theirs));
    expect(Number(source.match(/ZXING_WASM_BYTES = (\d+)/)?.[1])).toBe(theirs.length);
    // The wrapper intercepts one exact URL: it must be the one zxing-wasm asks for.
    expect(source).toContain('https://fastly.jsdelivr.net/npm/zxing-wasm@${ZXING_WASM_VERSION}/dist/reader/zxing_reader.wasm');
    expect(readFileSync(`${upstream}/dist/es/share.js`, 'utf8')).toContain(`fastly.jsdelivr.net/npm/zxing-wasm@${hosted}/dist/`);
  });
});
