// Creates the staff accounts of the Rouge night (SPEC A9: door-staff accounts are created by script):
// one account per person, with a profile and a role at the venue of the content file.
//
// CSV (git-ignored, e.g. content/rouge-staff.local.csv), one person per line:
//   email,role[,date_of_birth]
//   door1@example.com,venue_door,1990-05-17
//   bar1@example.com,venue_staff
// role: venue_door (door scan) | venue_staff (bar scan) | venue_manager (live stats + scan)
// date_of_birth (YYYY-MM-DD) is optional: profiles need one (18+ rule); without it the
// placeholder below is stored (see docs/DEPLOY.md).
//
// Existing accounts are kept as they are (password, profile): only the venue role is added or changed.
// Roles at the venue for people missing from the CSV are listed, never removed.
//
// DRY-RUN BY DEFAULT. Usage (docs/DEPLOY.md § Scripts Rouge):
//   pnpm rouge:staff --target local --content content/rouge.local.json --csv content/rouge-staff.local.csv [--apply]
//     local: new accounts get a random password, printed ONCE at the end.
//   pnpm rouge:staff --target prod --content ... --csv ... --invite-redirect https://<customer site>/reset-password --apply --confirm-prod
//     production: new accounts get an invitation email (inviteUserByEmail) to choose their password.
import { randomBytes, randomInt } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { Refusal, connect, isDate, parseArgs, readJson, run } from './lib.mjs';

/** Stored when the CSV gives no date of birth. 18+ by construction; not a real birthday. */
export const PLACEHOLDER_DOB = '1990-01-01';
const ROLES = ['venue_door', 'venue_staff', 'venue_manager'];
const ROLE_LABEL = { venue_door: 'Door', venue_staff: 'Bar', venue_manager: 'Manager' };
const EMAIL = /^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/;

function readCsv(path) {
  let text;
  try {
    text = readFileSync(path, 'utf8');
  } catch (e) {
    throw new Refusal(`Cannot read ${path}: ${e.message}`);
  }
  const rows = [];
  const errors = [];
  const seen = new Set();
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim();
    if (!line || line.startsWith('#')) return;
    const cells = line.split(',').map((c) => c.trim());
    if (i === 0 && cells[0].toLowerCase() === 'email') return; // header
    const [emailRaw, role, dob] = cells;
    const email = (emailRaw ?? '').toLowerCase();
    const where = `line ${i + 1}`;
    if (cells.length > 3) errors.push(`${where}: expected email,role[,date_of_birth]`);
    if (!EMAIL.test(email)) errors.push(`${where}: "${emailRaw}" is not an email`);
    if (!ROLES.includes(role)) errors.push(`${where}: role must be one of ${ROLES.join(', ')}`);
    if (dob && !isDate(dob)) errors.push(`${where}: date_of_birth must look like 1990-05-17`);
    if (dob && isDate(dob)) {
      const adult = new Date();
      adult.setFullYear(adult.getFullYear() - 18);
      if (new Date(`${dob}T00:00:00Z`) > adult) errors.push(`${where}: staff must be 18 or older`);
    }
    if (seen.has(email)) errors.push(`${where}: ${email} appears twice`);
    seen.add(email);
    rows.push({ email, role, dob: dob || null });
  });
  if (errors.length) throw new Refusal(`The CSV is not valid:\n  - ${errors.join('\n  - ')}`);
  if (!rows.length) throw new Refusal('The CSV has no staff lines.');
  return rows;
}

/** 20 characters, letters AND digits (Auth requires letters_digits), no look-alike characters. */
function randomPassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  for (;;) {
    let p = '';
    for (let i = 0; i < 20; i++) p += alphabet[randomInt(alphabet.length)];
    if (/[A-Za-z]/.test(p) && /\d/.test(p)) return p;
  }
}

/** Public username without any real name in it (SPEC A5): <venue>_<role>_<random>. */
function staffUsername(venueName, role) {
  const slug = venueName.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 8) || 'venue';
  return `${slug}_${ROLE_LABEL[role].toLowerCase()}_${randomBytes(3).toString('hex')}`;
}

function must({ data, error }, what) {
  if (error) throw new Error(`${what}: ${error.message}`);
  return data;
}

async function allUsersByEmail(db) {
  const byEmail = new Map();
  for (let page = 1; ; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`list accounts: ${error.message}`);
    for (const u of data.users) if (u.email) byEmail.set(u.email.toLowerCase(), u);
    if (data.users.length < 1000) return byEmail;
  }
}

await run(async () => {
  const args = parseArgs(process.argv.slice(2), {
    valued: ['target', 'content', 'csv', 'invite-redirect'],
    flags: ['apply', 'confirm-prod', 'invite'],
  });
  if (!args.content) throw new Refusal('--content <file.json> is required (the venue is read from it).');
  if (!args.csv) throw new Refusal('--csv <file.csv> is required (email,role[,date_of_birth]).');
  const content = readJson(args.content);
  const venueName = content?.venue?.name?.trim();
  if (!venueName) throw new Refusal('venue.name is missing in the content file.');
  const staff = readCsv(args.csv);
  const { target, url, client: db } = connect(args);
  const apply = Boolean(args.apply);
  // Production always invites; locally, --invite tests the same path (the email lands in Mailpit).
  if (target === 'prod') {
    // The template CSV uses example.com addresses: never create those accounts (or give them a venue role) in production.
    const fake = staff.filter((s) => /@(.+\.)?example\.(com|org|net)$/.test(s.email) || /placeholder/i.test(s.email));
    if (fake.length) throw new Refusal(`Refusing to create placeholder accounts in production: ${fake.map((s) => s.email).join(', ')}`);
  }
  const invite = target === 'prod' || Boolean(args.invite);
  const redirectTo = args['invite-redirect'];
  if (invite && target === 'prod' && !/^https:\/\/[^/]+\/reset-password$/.test(redirectTo ?? '')) {
    throw new Refusal('--invite-redirect https://<customer site>/reset-password is required in production (where invited staff choose their password).');
  }

  // Venue: the one created by rouge:setup (explicit columns only, SPEC A10).
  const venueQuery = db.from('venues').select('id, name, partner_status, is_demo');
  const venues = must(
    content.venue.id ? await venueQuery.eq('id', content.venue.id) : await venueQuery.eq('name', venueName).eq('is_demo', false),
    'read venue',
  );
  if (venues.length !== 1) {
    throw new Refusal(venues.length ? `${venues.length} venues are named "${venueName}": add "id" to "venue" in the content file.` : `Venue "${venueName}" not found: run pnpm rouge:setup first.`);
  }
  const venue = venues[0];
  if (venue.is_demo || venue.partner_status !== 'partner') throw new Refusal(`Venue "${venue.name}" is not a real partner venue.`);

  console.log(`${apply ? 'APPLY' : 'DRY-RUN (nothing is written; add --apply)'} — target ${target} (${target === 'local' ? url : new URL(url).host})`);
  console.log(`Venue: ${venue.name} (${venue.id}) — new accounts ${invite ? 'get an invitation email' : 'get a random password (printed once)'}\n`);

  const users = await allUsersByEmail(db);
  const memberships = must(await db.from('venue_memberships').select('user_id, role').eq('venue_id', venue.id), 'read venue roles');
  const roleOf = new Map(memberships.map((m) => [m.user_id, m.role]));
  const knownIds = [...users.values()].filter((u) => staff.some((s) => s.email === u.email?.toLowerCase())).map((u) => u.id);
  const profiles = knownIds.length ? must(await db.from('profiles').select('id').in('id', knownIds), 'read profiles') : [];
  const hasProfile = new Set(profiles.map((p) => p.id));

  const passwords = [];
  let changes = 0;
  try {
    for (const s of staff) {
      const existing = users.get(s.email);
      let userId = existing?.id ?? null;
      const steps = [];
      if (!existing) {
        steps.push(invite ? 'invite new account' : 'create account');
        if (apply) {
          if (invite) {
            const { data, error } = await db.auth.admin.inviteUserByEmail(s.email, { redirectTo });
            if (error) throw new Error(`invite ${s.email}: ${error.message}`);
            userId = data.user.id;
          } else {
            const password = randomPassword();
            const { data, error } = await db.auth.admin.createUser({ email: s.email, password, email_confirm: true });
            if (error) throw new Error(`create ${s.email}: ${error.message}`);
            userId = data.user.id;
            passwords.push({ email: s.email, password });
          }
        }
      }
      if (!userId || !hasProfile.has(userId)) {
        steps.push(`create profile (date of birth: ${s.dob ?? `${PLACEHOLDER_DOB} placeholder`})`);
        if (apply) {
          for (let attempt = 0; ; attempt++) {
            const { error } = await db.from('profiles').insert({
              id: userId,
              username: staffUsername(venue.name, s.role),
              display_name: `${venue.name} ${ROLE_LABEL[s.role]}`.slice(0, 60),
              date_of_birth: s.dob ?? PLACEHOLDER_DOB,
            });
            if (!error) break;
            if (error.code !== '23505' || attempt >= 2) throw new Error(`profile ${s.email}: ${error.message}`);
          }
        }
      }
      const current = userId ? roleOf.get(userId) : undefined;
      if (current !== s.role) {
        steps.push(current ? `change role ${current} → ${s.role}` : `add role ${s.role}`);
        if (apply) {
          must(
            await db.from('venue_memberships').upsert({ user_id: userId, venue_id: venue.id, role: s.role }, { onConflict: 'user_id,venue_id' }).select('user_id'),
            `role ${s.email}`,
          );
        }
      }
      if (steps.length) changes++;
      console.log(`${steps.length ? (existing ? '~' : '+') : '='} ${s.email.padEnd(32)} ${s.role.padEnd(14)} ${steps.length ? steps.join(', ') : 'unchanged'}`);
    }
  } finally {
    // Printed even if a later line fails, so no new password is ever lost.
    if (passwords.length) {
      console.log('\nNew passwords — shown ONCE, not stored anywhere. Hand each one over in person:');
      for (const p of passwords) console.log(`  ${p.email.padEnd(34)} ${p.password}`);
    }
  }

  const listed = new Set(staff.map((s) => users.get(s.email)?.id).filter(Boolean));
  const others = memberships.filter((m) => !listed.has(m.user_id));
  if (others.length) {
    console.log(`\n${others.length} other account(s) have a role at ${venue.name} and are NOT in the CSV (left unchanged):`);
    const emailOf = new Map([...users.values()].map((u) => [u.id, u.email]));
    for (const m of others) console.log(`  ${(emailOf.get(m.user_id) ?? m.user_id).padEnd(34)} ${m.role}`);
  }

  if (!apply) {
    console.log(`\nDry-run: ${changes} account(s) would change. Nothing was changed. Re-run with --apply to write.`);
    return;
  }
  console.log(`\n✓ Done: ${changes} account(s) changed.`);
  if (invite && changes) console.log('\nInvited staff choose their password from the email link, then sign in on the staff site.');
});
