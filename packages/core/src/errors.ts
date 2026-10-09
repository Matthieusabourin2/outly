/**
 * Maps the OUTLY_* codes raised by SQL functions to user-facing copy.
 * Never show a raw Postgres / PostgREST error to a user (CLAUDE.md).
 */

export const OUTLY_ERROR_MESSAGES = {
  OUTLY_AUTH_REQUIRED: 'Please log in to continue.',
  OUTLY_UNDER_18: 'Outly is for people aged 18 and over.',
  OUTLY_SUSPENDED: 'Your account is suspended. Contact Outly support if you think this is a mistake.',
  OUTLY_FORBIDDEN: "You don't have access to do that.",
  OUTLY_FORBIDDEN_COLUMN: "You don't have permission to change that setting.",
  OUTLY_NOT_FOUND: "We couldn't find that. It may have been removed.",
  OUTLY_NOT_PARTNER: "Bookings aren't available at this venue on Outly yet.",
  OUTLY_IN_PAST: 'That time has already passed. Pick a later time.',
  OUTLY_LIST_CLOSED: 'The guest list for tonight has closed.',
  OUTLY_LIST_FULL: 'The guest list is full for tonight.',
  OUTLY_ALREADY_ON_LIST: "You're already on the guest list for this night.",
  OUTLY_NOT_PENDING: 'This request has already been handled.',
  OUTLY_NOT_CONFIRMED: "This booking isn't confirmed, so it can't be checked in.",
  OUTLY_NOT_CANCELLABLE: "This booking can't be cancelled any more.",
  OUTLY_QR_USED_OR_INVALID: 'This pass has already been used or is not valid.',
  OUTLY_WRONG_NIGHT: 'This pass is for a different night.',
} as const;

export type OutlyErrorCode = keyof typeof OUTLY_ERROR_MESSAGES;

export const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again.';

const CODE_PATTERN = /OUTLY_[A-Z0-9_]+/;

export function isOutlyErrorCode(code: string): code is OutlyErrorCode {
  return Object.prototype.hasOwnProperty.call(OUTLY_ERROR_MESSAGES, code);
}

/** Extracts the OUTLY_* code from a Supabase/PostgREST error (or any thrown value). */
export function getOutlyErrorCode(error: unknown): OutlyErrorCode | null {
  const text =
    typeof error === 'string'
      ? error
      : error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
        ? error.message
        : null;
  const match = text?.match(CODE_PATTERN)?.[0];
  return match && isOutlyErrorCode(match) ? match : null;
}

/** The only function screens should use to turn an error into copy. */
export function toUserMessage(error: unknown): string {
  const code = getOutlyErrorCode(error);
  return code ? OUTLY_ERROR_MESSAGES[code] : GENERIC_ERROR_MESSAGE;
}
