import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  GENERIC_ERROR_MESSAGE,
  NETWORK_ERROR_MESSAGE,
  OUTLY_ERROR_MESSAGES,
  getOutlyErrorCode,
  isNetworkError,
  isUniqueViolation,
  toUserMessage,
} from './errors';

const migrationsDir = fileURLToPath(new URL('../../../supabase/migrations/', import.meta.url));

describe('OUTLY_* error mapping', () => {
  it('has a message for every code raised in migrations', () => {
    const sql = readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .map((f) => readFileSync(`${migrationsDir}${f}`, 'utf8'))
      .join('\n');
    const codes = new Set(sql.match(/OUTLY_[A-Z0-9_]+/g));
    for (const code of codes) expect(OUTLY_ERROR_MESSAGES).toHaveProperty(code);
  });

  it('extracts the code from a PostgREST error', () => {
    expect(getOutlyErrorCode({ message: 'OUTLY_LIST_FULL', code: 'P0001' })).toBe('OUTLY_LIST_FULL');
    expect(toUserMessage({ message: 'OUTLY_LIST_FULL' })).toBe(OUTLY_ERROR_MESSAGES.OUTLY_LIST_FULL);
  });

  it('never leaks raw SQL errors', () => {
    expect(toUserMessage({ message: 'duplicate key value violates unique constraint "x"' })).toBe(GENERIC_ERROR_MESSAGE);
    expect(toUserMessage(new Error('OUTLY_MADE_UP'))).toBe(GENERIC_ERROR_MESSAGE);
    expect(toUserMessage(undefined)).toBe(GENERIC_ERROR_MESSAGE);
  });
});

describe('network errors', () => {
  it('recognises a failed request in every browser', () => {
    // What supabase-js returns when fetch itself throws (Chrome, Safari, Firefox, React Native).
    for (const message of [
      'TypeError: Failed to fetch',
      'Load failed',
      'NetworkError when attempting to fetch resource.',
      'Network request failed',
    ]) {
      expect(isNetworkError({ message })).toBe(true);
      expect(toUserMessage({ message, details: '', hint: '', code: '' })).toBe(NETWORK_ERROR_MESSAGE);
    }
    expect(toUserMessage({ name: 'AuthRetryableFetchError', message: '{}' })).toBe(NETWORK_ERROR_MESSAGE);
  });
  it('keeps OUTLY_* codes first and other errors generic', () => {
    expect(toUserMessage({ message: 'OUTLY_LIST_FULL' })).toBe(OUTLY_ERROR_MESSAGES.OUTLY_LIST_FULL);
    expect(isNetworkError({ message: 'JWT expired' })).toBe(false);
    expect(isNetworkError(null)).toBe(false);
  });
});

describe('isUniqueViolation', () => {
  const taken = { code: '23505', message: 'duplicate key value violates unique constraint "profiles_username_key"', details: 'Key (username)=(Jess) already exists.' };
  const exists = { code: '23505', message: 'duplicate key value violates unique constraint "profiles_pkey"' };
  it('tells which constraint was hit', () => {
    expect(isUniqueViolation(taken, 'profiles_username_key')).toBe(true);
    expect(isUniqueViolation(exists, 'profiles_username_key')).toBe(false);
    expect(isUniqueViolation(exists, 'profiles_pkey')).toBe(true);
    expect(isUniqueViolation(exists)).toBe(true);
  });
  it('ignores other errors', () => {
    expect(isUniqueViolation({ code: '23514', message: 'profiles_username_key' }, 'profiles_username_key')).toBe(false);
    expect(isUniqueViolation(undefined)).toBe(false);
  });
});
