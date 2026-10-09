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
