import { describe, expect, it } from 'vitest';
import { isNightOver, sydneyDay, sydneyNight, sydneyTime } from './night';

describe('Sydney night', () => {
  it('keeps 1am in the previous night', () => {
    // 24 Oct 2026, 23:00 and 25 Oct 01:00 Sydney (AEDT = UTC+11)
    expect(sydneyNight(new Date('2026-10-24T12:00:00Z'))).toBe('2026-10-24');
    expect(sydneyNight(new Date('2026-10-24T14:00:00Z'))).toBe('2026-10-24');
    // 25 Oct 07:00 Sydney is a new day
    expect(sydneyNight(new Date('2026-10-24T20:00:00Z'))).toBe('2026-10-25');
  });
  it('formats times and days in Sydney', () => {
    expect(sydneyTime('2026-10-24T10:30:00Z')).toBe('9:30pm');
    expect(sydneyDay('2026-10-24')).toBe('Sat 24 Oct');
  });
});

describe('isNightOver', () => {
  const start = '2026-10-24T10:00:00Z'; // 9pm Sydney
  const end = '2026-10-24T16:00:00Z'; // 3am Sydney
  it('uses the end time when there is one', () => {
    expect(isNightOver(start, end, new Date('2026-10-24T15:59:00Z'))).toBe(false);
    expect(isNightOver(start, end, new Date('2026-10-24T16:01:00Z'))).toBe(true);
  });
  it('falls back to 8 hours after the start', () => {
    expect(isNightOver(start, null, new Date('2026-10-24T17:59:00Z'))).toBe(false);
    expect(isNightOver(start, null, new Date('2026-10-24T18:01:00Z'))).toBe(true);
  });
  it('is never over without any time', () => {
    expect(isNightOver(null, null)).toBe(false);
  });
});
