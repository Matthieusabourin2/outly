import type { Enums } from '@outly/db';

export type ScanOutcome = Enums<'scan_result'> | 'offline' | 'slow' | 'error';

/** Door staff read these at a glance: short title, one instruction. */
export const DOOR_TEXT: Record<ScanOutcome, { title: string; body: string; tone: 'ok' | 'bad' | 'warn' }> = {
  ok: { title: 'Fast lane OK', body: 'Now check their ticket.', tone: 'ok' },
  already_used: { title: 'Pass already used', body: 'Send them to the normal line with their ticket.', tone: 'bad' },
  invalid: { title: 'Invalid pass', body: 'This is not a valid Outly pass for this venue.', tone: 'bad' },
  wrong_night: { title: 'Not for tonight', body: 'This pass is for another night.', tone: 'bad' },
  not_confirmed: { title: 'Pass not active', body: 'This booking was cancelled. Normal line.', tone: 'bad' },
  forbidden: { title: 'Pass blocked', body: 'This account is suspended. Normal line.', tone: 'bad' },
  offline: { title: 'No connection', body: 'Passes can’t be checked right now. Use the normal line.', tone: 'warn' },
  slow: { title: 'No answer', body: 'The connection is too slow. Scan again, or use the normal line.', tone: 'warn' },
  error: { title: 'Something went wrong', body: 'Try again, or use the normal line.', tone: 'warn' },
};

export const BAR_TEXT: Record<ScanOutcome, { title: string; body: string; tone: 'ok' | 'bad' | 'warn' }> = {
  ...DOOR_TEXT,
  ok: { title: 'Offer OK', body: 'Apply the Outly offer to this order.', tone: 'ok' },
  already_used: { title: 'Offer already used', body: 'This pass has already used tonight’s offer.', tone: 'bad' },
};

export const RESULT_LABELS: Record<Enums<'scan_result'>, string> = {
  ok: 'OK',
  already_used: 'Already used',
  invalid: 'Invalid',
  wrong_night: 'Wrong night',
  not_confirmed: 'Not active',
  forbidden: 'Blocked',
};

/** Offline banner on the staff site (SPEC: "no network, use the normal line"). */
export const OFFLINE_STAFF_MESSAGE = 'Passes can’t be checked right now. Use the normal line with tickets.';
