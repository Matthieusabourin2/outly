import { z } from 'zod';

/** Mirrors the profiles.username check in 0001_init.sql. */
export const usernameSchema = z
  .string()
  .trim()
  .regex(/^[a-zA-Z0-9_.]{3,24}$/, '3–24 characters: letters, numbers, dots or underscores.');

export const displayNameSchema = z.string().trim().min(1, 'Enter your first name.').max(60, 'Keep it under 60 characters.');

export const MINIMUM_AGE = 18;

/** Builds a calendar date from day / month / year fields; null if it isn't a real date. */
export function parseDateOfBirth(day: string, month: string, year: string): Date | null {
  const d = Number(day), m = Number(month), y = Number(year);
  if (!Number.isInteger(d) || !Number.isInteger(m) || !Number.isInteger(y)) return null;
  if (y < 1900 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return date;
}

/** Same rule as the enforce_adult() trigger: turned 18 on or before today. */
export function isAdult(dateOfBirth: Date, today: Date = new Date()): boolean {
  const limit = new Date(Date.UTC(today.getUTCFullYear() - MINIMUM_AGE, today.getUTCMonth(), today.getUTCDate()));
  return dateOfBirth.getTime() <= limit.getTime();
}

/** ISO date (YYYY-MM-DD) for the profiles.date_of_birth column. */
export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
