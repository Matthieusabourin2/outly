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
  OUTLY_DELETE_FAILED: "We couldn't delete your account. Please try again, or contact Outly support.",
} as const;

export type OutlyErrorCode = keyof typeof OUTLY_ERROR_MESSAGES;

export const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again.';

export const NETWORK_ERROR_MESSAGE = 'No connection. Check your internet and try again.';

/**
 * Browsers word a failed request differently: Chrome "Failed to fetch", Safari "Load failed",
 * Firefox "NetworkError when attempting to fetch resource", React Native "Network request failed".
 * supabase-js passes these through as the error message (auth errors as AuthRetryableFetchError).
 */
const NETWORK_PATTERN = /failed to fetch|load failed|networkerror|network request failed|network error|fetch failed|AuthRetryableFetchError/i;

/** True when the request never reached the server (offline, flaky 4G, DNS, timeout). */
export function isNetworkError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return typeof error === 'string' && NETWORK_PATTERN.test(error);
  const { message, name } = error as { message?: unknown; name?: unknown };
  return (typeof message === 'string' && NETWORK_PATTERN.test(message)) || (typeof name === 'string' && NETWORK_PATTERN.test(name));
}

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
  if (code) return OUTLY_ERROR_MESSAGES[code];
  return isNetworkError(error) ? NETWORK_ERROR_MESSAGE : GENERIC_ERROR_MESSAGE;
}

/**
 * Postgres unique violation (23505) on a given constraint, e.g. 'profiles_username_key'.
 * Lets a screen tell "username taken" apart from "this row already exists".
 */
export function isUniqueViolation(error: unknown, constraint?: string): boolean {
  if (!error || typeof error !== 'object') return false;
  const { code, message, details } = error as { code?: unknown; message?: unknown; details?: unknown };
  if (code !== '23505') return false;
  if (!constraint) return true;
  return [message, details].some((t) => typeof t === 'string' && t.includes(constraint));
}
