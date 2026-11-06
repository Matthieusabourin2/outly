// Adds (or updates) the Outly drinks offer of a venue's night, shown on the customer site and
// redeemable once per pass at the bar (redeem_offer). Only offers APPROVED by the venue (CLAUDE.md rule 4).
//
//   pnpm rouge:offer --target local|prod --content content/rouge.local.json \
//     --title "10% off cocktails for Outly members" --details "Main bar only, one per pass." \
//     [--until 23:00] [--no-alcohol] [--off] [--apply] [--confirm-prod]
//
// Dry-run by default. --off switches the offer off (status draft) without deleting it.
// --until is NOT enforced by the database or the sites: it is written into the offer text
// ("Until 11pm.") and the offer must be switched off at that time with --off.
import { Refusal, connect, parseArgs, readJson, run } from './lib.mjs';

await run(async () => {
  const args = parseArgs(process.argv.slice(2), {
    valued: ['target', 'content', 'title', 'details', 'until'],
    flags: ['apply', 'confirm-prod', 'no-alcohol', 'off'],
  });
  if (!args.content) throw new Refusal('--content <file.json> is required (venue and night are read from it).');
  const content = readJson(args.content);
  const title = (args.title ?? '').trim();
  if (!args.off && (title.length < 3 || title.length > 80)) throw new Refusal('--title must be 3 to 80 characters.');
  if (/placeholder/i.test(`${title} ${args.details ?? ''}`)) throw new Refusal('The offer still contains PLACEHOLDER.');
  if (args.until && !/^\d{2}:\d{2}$/.test(args.until)) throw new Refusal('--until must look like 23:00 (Sydney time).');
  const { target, url, client: db } = connect(args);
  const apply = Boolean(args.apply);

  const { data: venues, error: ve } = await db.from('venues').select('id, name').eq('name', content.venue.name).eq('is_demo', false);
  if (ve) throw ve;
  if (venues.length !== 1) throw new Refusal(`Venue "${content.venue.name}" not found (run rouge:setup first).`);
  const venue = venues[0];
  const { data: events } = await db.from('events').select('id, starts_at, ends_at').eq('venue_id', venue.id).order('starts_at', { ascending: false }).limit(1);
  const event = events?.[0];
  if (!event) throw new Refusal('No night found for this venue (run rouge:setup first).');

  // --until HH:MM (Sydney): same calendar night as the event (00:00–11:59 = the morning after).
  let endsAt = event.ends_at;
  if (args.until) {
    const start = new Date(event.starts_at);
    const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' }).format(start);
    const [h] = args.until.split(':').map(Number);
    const offset = new Intl.DateTimeFormat('en', { timeZone: 'Australia/Sydney', timeZoneName: 'longOffset' }).formatToParts(start).find((p) => p.type === 'timeZoneName').value.replace('GMT', '') || '+00:00';
    const until = new Date(`${day}T${args.until}:00${offset}`);
    if (h < 12) until.setUTCDate(until.getUTCDate() + 1);
    if (until <= start) throw new Refusal('--until is before the start of the night.');
    endsAt = until.toISOString();
  }

  const { data: existing } = await db.from('deals').select('id, title, status').eq('venue_id', venue.id).eq('source', 'outly_partner').contains('categories', ['drinks']);
  let description = args.details?.trim() || null;
  if (args.until && !args.off) {
    const [h, m] = args.until.split(':').map(Number);
    const label = `${h % 12 || 12}${m ? `:${String(m).padStart(2, '0')}` : ''}${h < 12 ? 'am' : 'pm'}`;
    description = `${description ? `${description.replace(/\.?$/, '.')} ` : ''}Until ${label}.`;
  }
  const row = {
    venue_id: venue.id,
    title: args.off ? existing?.[0]?.title : title,
    description,
    categories: ['drinks'],
    source: 'outly_partner',
    starts_at: event.starts_at,
    ends_at: endsAt,
    status: args.off ? 'draft' : 'active',
    involves_alcohol: !args['no-alcohol'],
  };
  if (args.off && !existing?.length) throw new Refusal('No offer to switch off.');
  const fmt = (d) => new Date(d).toLocaleString('en-AU', { timeZone: 'Australia/Sydney', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  console.log(`${apply ? 'APPLY' : 'DRY-RUN (nothing is written; add --apply)'} — target ${target} (${target === 'local' ? url : new URL(url).host})`);
  console.log(`${existing?.length ? '~ update' : '+ create'} offer at ${venue.name}: "${row.title}" — ${row.status === 'active' ? 'ON' : 'OFF'}`);
  if (!args.off) console.log(`  details: ${row.description ?? '(none)'} · ${fmt(row.starts_at)} → ${fmt(row.ends_at)} · alcohol: ${row.involves_alcohol ? 'yes' : 'no'}`);
  if (!apply) return;
  const q = existing?.length ? db.from('deals').update(row).eq('id', existing[0].id) : db.from('deals').insert(row);
  const { error } = await q;
  if (error) throw new Error(`offer: ${error.message}`);
  console.log('✓ Done.');
  if (args.until && !args.off) console.log(`⏰ Switch it off at ${args.until}: pnpm rouge:offer --target ${target} --content ${args.content} --off --apply${target === 'prod' ? ' --confirm-prod' : ''}`);
});
