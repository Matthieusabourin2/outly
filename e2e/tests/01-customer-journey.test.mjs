// Scenario 1 — a guest's whole journey on the customer site:
// sign up → 18+ refused → adult profile → Night → join as classic → QR pass → switch to ghost
// → delete the account → the old credentials no longer work.
import assert from 'node:assert/strict';
import { adminClient, userClient, VELVET_TRAM_NAME } from '../lib/env.mjs';
import { PASS_CODE, eventually, newIdentity } from '../lib/data.mjs';
import { accessTokenOf, button, fill, gone, scenario, see, notSee, tab, tap } from '../lib/harness.mjs';
import { decodeQrPng } from '../lib/qr.mjs';

scenario('customer: sign up, 18+ check, join as classic, QR pass, ghost, delete account', async (h) => {
  const me = newIdentity('s1');
  const admin = adminClient();
  const browser = await h.browser();
  const page = await h.page(browser, 'customer');

  // Sign up (the default tab) with a valid password.
  await see(page, 'Good times, anytime.');
  await fill(page, 'Email', me.email);
  await fill(page, 'Password', me.password);
  await h.shot(page, 'sign-up');
  await tap(page, 'Create account');

  // Profile: an under-18 date of birth is refused by the form.
  await see(page, 'Create your profile');
  const now = new Date();
  await fill(page, 'First name', me.name);
  await fill(page, 'Username', me.username);
  await fill(page, 'Day', String(now.getDate()));
  await fill(page, 'Month', String(now.getMonth() + 1));
  await fill(page, 'Year', String(now.getFullYear() - 17));
  await tap(page, 'Continue');
  await see(page, 'Outly is for people aged 18 and over.');
  await h.shot(page, 'under-18-refused');
  const { data: users } = await admin.from('profiles').select('id').eq('username', me.username);
  assert.equal(users.length, 0, 'no profile is saved for an under-18 date of birth');

  // Adult date of birth → the Night tab with the venue and the counter.
  await fill(page, 'Year', '1998');
  await tap(page, 'Continue');
  await see(page, VELVET_TRAM_NAME);
  await see(page, 'On the Outly list');
  await see(page, /^\d+ \/ 200$/);
  await see(page, 'Skip the queue with Outly');
  await h.shot(page, 'night');

  // Join as classic → lands on the Pass tab with a QR code.
  await tap(page, 'Join the Outly list');
  await see(page, 'How do you want to appear?');
  await page.getByRole('radio', { name: /Classic/ }).click();
  await tap(page, 'Join as classic');
  await see(page, 'YOUR OUTLY PASS');
  await gone(page, 'How do you want to appear?');
  await see(page, `@${me.username}`);
  await see(page, 'FAST LANE · VALID ALL NIGHT');
  const qr = page.getByRole('img', { name: 'QR code of your Outly pass' }).filter({ visible: true }).first();
  await qr.waitFor();
  await h.shot(page, 'pass');

  // The QR on screen decodes to OUTLY1:<booking_id>:<nonce> = the booking read with the customer's own session.
  const decoded = decodeQrPng(await qr.screenshot());
  assert.match(decoded ?? '', PASS_CODE, 'the pass QR decodes to OUTLY1:<booking_id>:<nonce>');
  const token = await accessTokenOf(page);
  const mine = userClient(token);
  const userId = (await admin.auth.getUser(token)).data.user?.id;
  assert.ok(userId, 'the customer is signed in');
  const { data: booking, error } = await mine.from('bookings').select('id, qr_nonce, status, attendee_visibility').single();
  assert.ifError(error);
  assert.equal(decoded, `OUTLY1:${booking.id}:${booking.qr_nonce}`.toUpperCase(), 'the QR carries the upper-case pass code');
  assert.equal(booking.status, 'confirmed');
  assert.equal(booking.attendee_visibility, 'classic');

  // Profile: switch to ghost.
  await tab(page, 'Profile').click();
  await see(page, `On the list for ${VELVET_TRAM_NAME}`);
  await page.getByRole('radio', { name: /Ghost/ }).filter({ visible: true }).first().click();
  await eventually(
    async () => (await mine.from('bookings').select('attendee_visibility').eq('id', booking.id).single()).data?.attendee_visibility === 'ghost',
    { message: 'the booking to switch to ghost' },
  );
  await h.shot(page, 'profile-ghost');
  // The radios don't expose aria-checked on web (see the e2e report), so check the effect on the Night tab instead.
  await tab(page, 'Night').click();
  await see(page, /^You're in ghost mode/);
  await h.shot(page, 'night-ghost');
  await tab(page, 'Profile').click();

  // Delete the account: back to sign-in, everything gone.
  await tap(page, 'Delete my account'); // opens the confirmation sheet
  await see(page, 'Delete your account?');
  await h.shot(page, 'delete-confirm');
  await button(page, 'Delete my account').click(); // the sheet's button (last in the page)
  await see(page, 'Good times, anytime.');
  const { data: deleted } = await admin.auth.admin.getUserById(userId);
  assert.equal(deleted?.user ?? null, null, 'the auth user is deleted');
  const { data: profile } = await admin.from('profiles').select('id').eq('id', userId);
  assert.equal(profile.length, 0, 'the profile is deleted');
  const { data: leftover } = await admin.from('bookings').select('id').eq('id', booking.id);
  assert.equal(leftover.length, 0, 'the booking is deleted with the account');

  // Logging in again with the old credentials fails.
  await tab(page, 'Log in').click();
  await fill(page, 'Email', me.email);
  await fill(page, 'Password', me.password);
  await button(page, 'Log in').click();
  await see(page, 'Wrong email or password.');
  await notSee(page, 'Create your profile');
  await h.shot(page, 'login-after-delete');
});
