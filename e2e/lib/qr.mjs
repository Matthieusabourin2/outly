// QR helpers: a fake camera frame for Chrome, and decoding the pass QR from a screenshot.
// Pure JavaScript (no `sips` / ImageMagick), so it runs the same on macOS and Windows.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import jpeg from 'jpeg-js';
import jsQR from 'jsqr';
import { PNG } from 'pngjs';
import QRCode from 'qrcode';

const WIDTH = 640;
const HEIGHT = 480;

/**
 * Writes a 640x480 JPEG with `text` as a QR code centred on white, saved as a one-frame
 * .mjpeg that Chrome loops as the camera (--use-file-for-fake-video-capture).
 */
export function writeFakeCameraFile(text, file) {
  const qr = QRCode.create(text, { errorCorrectionLevel: 'M' });
  const size = qr.modules.size;
  const quiet = 4; // modules of white border around the code
  const scale = Math.floor((HEIGHT - 40) / (size + quiet * 2));
  const side = size * scale;
  const left = Math.floor((WIDTH - side) / 2);
  const top = Math.floor((HEIGHT - side) / 2);

  const data = Buffer.alloc(WIDTH * HEIGHT * 4, 255);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!qr.modules.get(r, c)) continue;
      for (let y = top + r * scale; y < top + (r + 1) * scale; y++) {
        for (let x = left + c * scale; x < left + (c + 1) * scale; x++) {
          const i = (y * WIDTH + x) * 4;
          data[i] = data[i + 1] = data[i + 2] = 0;
        }
      }
    }
  }
  const { data: jpg } = jpeg.encode({ data, width: WIDTH, height: HEIGHT }, 92);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, jpg);
  return file;
}

/** Decodes the QR code in a PNG screenshot (Buffer). Returns the text, or null. */
export function decodeQrPng(pngBuffer) {
  const png = PNG.sync.read(pngBuffer);
  const result = jsQR(new Uint8ClampedArray(png.data.buffer, png.data.byteOffset, png.data.length), png.width, png.height);
  return result?.data ?? null;
}
