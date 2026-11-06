// Creates or updates the Rouge night from a content file (SPEC A9: event content is entered by script):
// the partner venue, the event (source outly_partner, status active), its guest list and the line-up.
// Idempotent: running it again with the same file changes nothing.
//
// DRY-RUN BY DEFAULT. Usage (docs/DEPLOY.md § Scripts Rouge):
//   pnpm rouge:setup --target local --content content/rouge.local.json            # print the plan
//   pnpm rouge:setup --target local --content content/rouge.local.json --apply    # write (local)
//   pnpm rouge:setup --target prod --content content/rouge.local.json --apply --confirm-prod
//     (production: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY set in the shell, never in a file)
import {
  Refusal,
  assertNoPlaceholder,
  connect,
  formatSydney,
  isDate,
  isTime,
  nightTime,
  parseArgs,
  readJson,
  run,
} from './lib.mjs';

// Explicit columns only: venue commercial columns are not granted to API roles (SPEC A10).
const VENUE_COLS = 'id, name, address, lat, lng, categories, description, partner_status, is_demo';
const EVENT_COLS = 'id, venue_id, title, description, tags, starts_at, ends_at, source, status, is_demo';
const LIST_COLS = 'id, venue_id, event_id, night, capacity, closes_at, note';
const SET_COLS = 'id, artist_name, stage, starts_at, ends_at, sort';

function validate(c) {
  const errors = [];
  const v = c?.venue ?? {};
  const e = c?.event ?? {};
  const g = c?.guestList ?? {};
  if (v.id !== undefined && !/^[0-9a-f-]{36}$/i.test(v.id)) errors.push('venue.id must be a UUID (or be left out)');
  if (typeof v.name !== 'string' || !v.name.trim()) errors.push('venue.name is required');
  for (const k of ['address', 'description']) if (v[k] !== undefined && v[k] !== null && typeof v[k] !== 'string') errors.push(`venue.${k} must be text`);
  for (const k of ['lat', 'lng']) if (v[k] !== undefined && v[k] !== null && typeof v[k] !== 'number') errors.push(`venue.${k} must be a number`);
  if (v.categories !== undefined && !(Array.isArray(v.categories) && v.categories.every((x) => typeof x === 'string'))) errors.push('venue.categories must be a list of words');
  if (typeof e.title !== 'string' || e.title.trim().length < 3 || e.title.length > 100) errors.push('event.title: 3 to 100 characters');
  if (e.description !== undefined && e.description !== null && typeof e.description !== 'string') errors.push('event.description must be text');
  if (e.tags !== undefined && !(Array.isArray(e.tags) && e.tags.every((x) => typeof x === 'string'))) errors.push('event.tags must be a list of words');
  if (!isDate(e.night)) errors.push('event.night must be a date like 2026-10-24');
  if (!isTime(e.start)) errors.push('event.start must be a time like 21:00');
  if (e.end !== undefined && e.end !== null && !isTime(e.end)) errors.push('event.end must be a time like 03:00 (or null)');
  if (!Number.isInteger(g.capacity) || g.capacity < 1) errors.push('guestList.capacity must be a whole number ≥ 1');
  if (g.closesAt !== undefined && g.closesAt !== null && Number.isNaN(Date.parse(g.closesAt))) errors.push('guestList.closesAt must be null or a date-time with offset, e.g. 2026-10-24T23:00:00+11:00');
  if (g.perk !== undefined && g.perk !== null && typeof g.perk !== 'string') errors.push('guestList.perk must be text');
  if (!Array.isArray(c?.lineup)) errors.push('lineup must be a list (it can be empty: [])');
  else
    c.lineup.forEach((s, i) => {
      if (typeof s?.artist !== 'string' || !s.artist.trim() || s.artist.length > 80) errors.push(`lineup[${i}].artist: 1 to 80 characters`);
      if (s?.stage != null && (typeof s.stage !== 'string' || s.stage.length > 40)) errors.push(`lineup[${i}].stage: up to 40 characters`);
      for (const k of ['start', 'end']) if (s?.[k] != null && !isTime(s[k])) errors.push(`lineup[${i}].${k} must be a time like 23:00 (or null)`);
    });
  if (errors.length) throw new Refusal(`The content file is not valid:\n  - ${errors.join('\n  - ')}`);
}

const iso = (d) => (d ? new Date(d).toISOString() : null);
const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** Fields of `want` that differ from `row` (timestamps compared as instants). */
function diff(row, want, timeKeys = []) {
  const changed = {};
  for (const [k, v] of Object.entries(want)) {
    const a = timeKeys.includes(k) ? iso(row?.[k]) : row?.[k];
    const b = timeKeys.includes(k) ? iso(v) : v;
    if (!same(a, b)) changed[k] = v;
  }
  return changed;
}

function must({ data, error }, what) {
  if (error) throw new Error(`${what}: ${error.message}`);
  return data;
}

await run(async () => {
  const args = parseArgs(process.argv.slice(2), { valued: ['target', 'content'], flags: ['apply', 'confirm-prod'] });
  if (!args.content) throw new Refusal('--content <file.json> is required (start from content/rouge.example.json).');
  const content = readJson(args.content);
  validate(content);
  const { target, url, client: db } = connect(args);
  if (target === 'prod') assertNoPlaceholder(content);
  const apply = Boolean(args.apply);

  const { venue: v, event: e, guestList: g, lineup } = content;
  const startsAt = nightTime(e.night, e.start);
  const endsAt = e.end ? nightTime(e.night, e.end) : null;
  if (endsAt && endsAt <= startsAt) throw new Refusal('event.end must be after event.start.');

  console.log(`${apply ? 'APPLY' : 'DRY-RUN (nothing is written; add --apply)'} — target ${target} (${target === 'local' ? url : new URL(url).host})`);
  console.log(`Night of ${e.night}: ${formatSydney(startsAt)} → ${endsAt ? formatSydney(endsAt) : 'no end time'}\n`);
  const plan = [];
  const note = (line) => {
    plan.push(line);
    console.log(line);
  };

  // ---- 1. Venue (partner) -------------------------------------------------------------
  let venueRow = null;
  if (v.id) {
    venueRow = must(await db.from('venues').select(VENUE_COLS).eq('id', v.id).maybeSingle(), 'read venue');
    if (!venueRow) throw new Refusal(`No venue with id ${v.id}.`);
  } else {
    const rows = must(await db.from('venues').select(VENUE_COLS).eq('name', v.name.trim()).eq('is_demo', false), 'read venues');
    if (rows.length > 1) throw new Refusal(`${rows.length} venues are named "${v.name}". Add "id" to "venue" in the content file to pick one.`);
    venueRow = rows[0] ?? null;
  }
  const venueWant = { name: v.name.trim(), partner_status: 'partner' };
  for (const k of ['address', 'description', 'lat', 'lng', 'categories']) if (v[k] !== undefined) venueWant[k] = v[k];

  let venueId = venueRow?.id ?? null;
  if (!venueRow) {
    note(`+ venue      create "${venueWant.name}" (partner)`);
    if (apply) venueId = must(await db.from('venues').insert({ ...venueWant, is_demo: false }).select('id').single(), 'create venue').id;
  } else {
    if (venueRow.is_demo) throw new Refusal(`Venue "${venueRow.name}" is a demo venue: refusing to use it for a real night.`);
    const changes = diff(venueRow, venueWant);
    if (Object.keys(changes).length) {
      note(`~ venue      update "${venueRow.name}" (${venueId}): ${Object.keys(changes).join(', ')}`);
      if (apply) must(await db.from('venues').update(changes).eq('id', venueId).select('id').single(), 'update venue');
    } else note(`= venue      "${venueRow.name}" (${venueId}) unchanged`);
  }

  // ---- 2. Event + guest list ------------------------------------------------------------
  // The night is found through its guest list (one Outly list per venue and night),
  // or, if a previous run stopped half-way, through the venue's Outly event on that night.
  let listRow = null;
  let eventRow = null;
  if (venueId) {
    const lists = must(
      await db.from('guest_lists').select(LIST_COLS).eq('venue_id', venueId).eq('night', e.night).not('event_id', 'is', null),
      'read guest lists',
    );
    if (lists.length > 1) throw new Refusal(`The venue has ${lists.length} event guest lists on ${e.night}; fix by hand first.`);
    listRow = lists[0] ?? null;
    if (listRow) {
      eventRow = must(await db.from('events').select(EVENT_COLS).eq('id', listRow.event_id).single(), 'read event');
    } else {
      const events = must(
        await db
          .from('events')
          .select(EVENT_COLS)
          .eq('venue_id', venueId)
          .eq('source', 'outly_partner')
          .gte('starts_at', nightTime(e.night, '12:00').toISOString())
          .lt('starts_at', nightTime(e.night, '11:59').toISOString()),
        'read events',
      );
      if (events.length > 1) throw new Refusal(`The venue has ${events.length} Outly events on ${e.night}; fix by hand first.`);
      eventRow = events[0] ?? null;
    }
  }

  const eventWant = {
    title: e.title.trim(),
    description: e.description ?? null,
    tags: e.tags ?? [],
    starts_at: startsAt.toISOString(),
    ends_at: endsAt ? endsAt.toISOString() : null,
    source: 'outly_partner',
    status: 'active',
  };
  let eventId = eventRow?.id ?? null;
  if (!eventRow) {
    note(`+ event      create "${eventWant.title}" (outly_partner, active)`);
    if (apply) eventId = must(await db.from('events').insert({ ...eventWant, venue_id: venueId, is_demo: false }).select('id').single(), 'create event').id;
  } else {
    const changes = diff(eventRow, eventWant, ['starts_at', 'ends_at']);
    if (Object.keys(changes).length) {
      note(`~ event      update "${eventRow.title}" (${eventId}): ${Object.keys(changes).join(', ')}`);
      if (apply) must(await db.from('events').update(changes).eq('id', eventId).select('id').single(), 'update event');
    } else note(`= event      "${eventRow.title}" (${eventId}) unchanged`);
  }

  const listWant = { capacity: g.capacity, closes_at: g.closesAt ?? null, note: g.perk ?? null };
  if (!listRow) {
    note(`+ guest list create: ${g.capacity} spots, ${g.closesAt ? `closes ${formatSydney(new Date(g.closesAt))}` : 'open until the night ends'}, perk "${g.perk ?? ''}"`);
    if (apply) {
      must(
        await db.from('guest_lists').insert({ ...listWant, venue_id: venueId, event_id: eventId, night: e.night }).select('id').single(),
        'create guest list',
      );
    }
  } else {
    const joined = must(
      await db.from('bookings').select('id').eq('guest_list_id', listRow.id).in('status', ['confirmed', 'checked_in']),
      'count bookings',
    ).length;
    if (g.capacity < joined) console.log(`  ! capacity ${g.capacity} is below the ${joined} people already on the list (they keep their pass).`);
    const changes = diff(listRow, listWant, ['closes_at']);
    if (Object.keys(changes).length) {
      note(`~ guest list update (${listRow.id}): ${Object.keys(changes).join(', ')} — ${joined} already joined`);
      if (apply) must(await db.from('guest_lists').update(changes).eq('id', listRow.id).select('id').single(), 'update guest list');
    } else note(`= guest list (${listRow.id}) unchanged — ${joined} already joined`);
  }

  // ---- 3. Line-up (replaced as a whole) --------------------------------------------------
  const setsWant = lineup.map((s, i) => ({
    artist_name: s.artist.trim(),
    stage: s.stage ?? null,
    starts_at: s.start ? nightTime(e.night, s.start).toISOString() : null,
    ends_at: s.end ? nightTime(e.night, s.end).toISOString() : null,
    sort: i + 1,
  }));
  const setsNow = eventRow
    ? must(await db.from('event_sets').select(SET_COLS).eq('event_id', eventRow.id).order('sort'), 'read line-up').map((s) => ({
        artist_name: s.artist_name,
        stage: s.stage,
        starts_at: iso(s.starts_at),
        ends_at: iso(s.ends_at),
        sort: s.sort,
      }))
    : [];
  if (same(setsNow, setsWant)) {
    note(`= line-up    unchanged (${setsWant.length} set${setsWant.length === 1 ? '' : 's'})`);
  } else {
    note(`~ line-up    replace ${setsNow.length} set(s) with ${setsWant.length}:`);
    for (const s of setsWant) {
      note(`    ${s.sort}. ${s.artist_name}${s.stage ? ` [${s.stage}]` : ''}${s.starts_at ? ` ${formatSydney(new Date(s.starts_at))}` : ''}${s.ends_at ? ` → ${formatSydney(new Date(s.ends_at))}` : ''}`);
    }
    if (apply) {
      must(await db.from('event_sets').delete().eq('event_id', eventId).select('id'), 'clear line-up');
      if (setsWant.length) must(await db.from('event_sets').insert(setsWant.map((s) => ({ ...s, event_id: eventId }))).select('id'), 'write line-up');
    }
  }

  const changes = plan.filter((l) => !l.startsWith('=') && !l.startsWith(' ')).length;
  console.log(
    apply
      ? `\n✓ Done: ${changes} change(s) written.`
      : `\nDry-run: ${changes} change(s) would be written. Nothing was changed. Re-run with --apply to write.`,
  );
});
