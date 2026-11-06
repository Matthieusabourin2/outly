import { describe, expect, it } from 'vitest';
import { makePassCode, parsePassCode, passQrValue } from './pass';

const id = '3f5e3cf1-69f3-4cad-9607-4e5f284b3b33';
const nonce = '0b7b1c52-6f0e-4b8e-9f43-2c1d1f0a9e11';

describe('pass code', () => {
  it('round-trips', () => {
    expect(parsePassCode(makePassCode(id, nonce))).toEqual({ bookingId: id, nonce });
  });
  it('rejects anything else', () => {
    expect(parsePassCode('hello')).toBeNull();
    expect(parsePassCode(`OUTLY2:${id}:${nonce}`)).toBeNull();
    expect(parsePassCode(`OUTLY1:${id}`)).toBeNull();
    expect(parsePassCode(`OUTLY1:${id}:${nonce}:extra`)).toBeNull();
    expect(parsePassCode(`OUTLY1:not-a-uuid:${nonce}`)).toBeNull();
  });
});

describe('pass QR value', () => {
  it('is upper case and still parses to the same booking', () => {
    const value = passQrValue(id, nonce);
    expect(value).toBe(value.toUpperCase());
    expect(value).toMatch(/^[0-9A-Z $%*+\-./:]+$/); // QR alphanumeric character set only
    expect(parsePassCode(value)).toEqual({ bookingId: id.toUpperCase(), nonce: nonce.toUpperCase() });
    expect(parsePassCode(value)!.bookingId.toLowerCase()).toBe(id);
  });
});
