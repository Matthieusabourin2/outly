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

/** Events without an end time are considered over this long after they start. */
export const DEFAULT_EVENT_HOURS = 8;

/** True once the event has finished: after its end time, or DEFAULT_EVENT_HOURS after its start. */
export function isNightOver(startsAt: string | null | undefined, endsAt: string | null | undefined, now: Date = new Date()): boolean {
  if (endsAt) return now.getTime() > new Date(endsAt).getTime();
  if (startsAt) return now.getTime() > new Date(startsAt).getTime() + DEFAULT_EVENT_HOURS * 3600 * 1000;
  return false;
}

/**
 * A venue can have several guest lists on the same night (e.g. a plain list and the event's
 * Outly list). Staff screens follow the one linked to an event, then the most recent one.
 */
export function pickTonightList<T extends { event_id: string | null; created_at: string }>(lists: readonly T[]): T | null {
  return (
    [...lists].sort((a, b) => {
      if ((a.event_id === null) !== (b.event_id === null)) return a.event_id === null ? 1 : -1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    })[0] ?? null
  );
}
