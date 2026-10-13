// Tiny static file server for the exported websites, with SPA fallback (any unknown path → index.html).
import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, sep } from 'node:path';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.map': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm',
  '.txt': 'text/plain; charset=utf-8',
};

function fileAt(root, urlPath) {
  let rel;
  try {
    rel = normalize(decodeURIComponent(urlPath.split('?')[0])).replace(/^([/\\])+/, '');
  } catch {
    return null;
  }
  const full = join(root, rel);
  if (full !== root && !full.startsWith(root + sep)) return null; // no path traversal
  try {
    const st = statSync(full);
    if (st.isFile()) return full;
    if (st.isDirectory()) {
      const index = join(full, 'index.html');
      if (statSync(index).isFile()) return index;
    }
  } catch {
    /* not found */
  }
  return null;
}

/** Serves `root` on 127.0.0.1:`port`. Resolves with the http.Server once listening. */
export function serveStatic(root, port) {
  const server = createServer((req, res) => {
    const found = fileAt(root, req.url ?? '/');
    // SPA fallback: client-side routes (/pass, /profile, /scan…) get the app shell.
    const file = found ?? (extname((req.url ?? '').split('?')[0]) ? null : join(root, 'index.html'));
    if (!file) {
      res.writeHead(404, { 'content-type': 'text/plain' }).end('Not found');
      return;
    }
    res.writeHead(200, { 'content-type': TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream', 'cache-control': 'no-store' });
    createReadStream(file).pipe(res);
  });
  return new Promise((resolve, reject) => {
    server.once('error', (e) =>
      reject(e.code === 'EADDRINUSE' ? new Error(`Port ${port} is already in use: stop whatever is using it and retry.`) : e),
    );
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}
