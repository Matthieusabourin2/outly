/**
 * The "night" a moment belongs to, Sydney time: 1am still counts as the previous evening.
 * Same rule as sydney_night() in supabase/migrations/0002_rouge_launch.sql.
 */
export const NIGHT_ROLLOVER_HOURS = 6;

export function sydneyNight(now: Date = new Date()): string {
  const shifted = new Date(now.getTime() - NIGHT_ROLLOVER_HOURS * 3600 * 1000);
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney', year: 'numeric', month: '2-digit', day: '2-digit' }).format(shifted);
}

/** "9:30pm" in Sydney time, for set times and scan times. */
export function sydneyTime(iso: string): string {
  return new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Sydney', hour: 'numeric', minute: '2-digit', hour12: true })
    .format(new Date(iso))
    .replace(/\s/g, '')
    .toLowerCase();
}

/** "Sat 24 Oct" in Sydney time. */
export function sydneyDay(isoOrDate: string): string {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(isoOrDate) ? new Date(`${isoOrDate}T12:00:00+10:00`) : new Date(isoOrDate);
  return new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Sydney', weekday: 'short', day: 'numeric', month: 'short' })
    .format(date)
    .replace(',', '');
}
