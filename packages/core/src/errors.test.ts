import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { GENERIC_ERROR_MESSAGE, OUTLY_ERROR_MESSAGES, getOutlyErrorCode, toUserMessage } from './errors';

const migrationsDir = fileURLToPath(new URL('../../../supabase/migrations/', import.meta.url));

describe('OUTLY_* error mapping', () => {
  it('has a message for every code raised in migrations', () => {
    const sql = readFileSync(`${migrationsDir}0001_init.sql`, 'utf8');
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
