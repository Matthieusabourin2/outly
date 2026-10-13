import { describe, expect, it } from 'vitest';
import { isAdult, normaliseUsername, parseDateOfBirth, toIsoDate, usernameSchema } from './profile';

describe('profile rules', () => {
  it('validates usernames like the database', () => {
    expect(usernameSchema.safeParse('jess.nights_1').success).toBe(true);
    expect(usernameSchema.safeParse('jo').success).toBe(false);
    expect(usernameSchema.safeParse('no spaces').success).toBe(false);
  });
  it('cleans up what people type as a username', () => {
    expect(normaliseUsername(' @Jess.Nights ')).toBe('Jess.Nights');
    expect(normaliseUsername('@@jess')).toBe('jess');
    expect(normaliseUsername('@ jess')).toBe('jess');
    // Spaces inside stay, so the rule explains what's wrong instead of silently changing the name.
    expect(usernameSchema.safeParse(normaliseUsername('jess nights')).success).toBe(false);
    expect(usernameSchema.safeParse(normaliseUsername('  @JESS_1  ')).success).toBe(true);
  });
  it('parses real dates only', () => {
    expect(toIsoDate(parseDateOfBirth('29', '02', '2004')!)).toBe('2004-02-29');
    expect(parseDateOfBirth('29', '02', '2005')).toBeNull();
    expect(parseDateOfBirth('31', '04', '2000')).toBeNull();
    expect(parseDateOfBirth('aa', '1', '2000')).toBeNull();
  });
  it('is 18+ from the 18th birthday', () => {
    const today = new Date(Date.UTC(2026, 9, 24));
    expect(isAdult(parseDateOfBirth('24', '10', '2008')!, today)).toBe(true);
    expect(isAdult(parseDateOfBirth('25', '10', '2008')!, today)).toBe(false);
  });
});
