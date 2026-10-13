/**
 * Guest pass QR payload (SPEC A7): `OUTLY1:<booking_id>:<nonce>`.
 * The nonce is random, single-use and rotated by the database at check-in.
 * Must stay in sync with parse_pass_code() in supabase/migrations/0002_rouge_launch.sql.
 */
export const PASS_PREFIX = 'OUTLY1';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function makePassCode(bookingId: string, nonce: string): string {
  return `${PASS_PREFIX}:${bookingId}:${nonce}`;
}

export function parsePassCode(text: string): { bookingId: string; nonce: string } | null {
  const [prefix, bookingId, nonce, ...rest] = text.trim().split(':');
  if (prefix?.toUpperCase() !== PASS_PREFIX || rest.length > 0) return null;
  if (!bookingId || !nonce || !UUID.test(bookingId) || !UUID.test(nonce)) return null;
  return { bookingId, nonce };
}

/**
 * The text drawn in the pass QR code. Upper case on purpose: every character of
 * "OUTLY1:<UUID>:<UUID>" is then in the QR alphanumeric set, which needs a smaller
 * code (33x33 modules instead of 37x37), so each module is bigger on screen and
 * easier to read from a bright phone at the door. Parsing is case-insensitive
 * (parsePassCode here, parse_pass_code() in SQL), so both forms are accepted.
 */
export function passQrValue(bookingId: string, nonce: string): string {
  return makePassCode(bookingId, nonce).toUpperCase();
}
