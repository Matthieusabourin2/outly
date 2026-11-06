// Scenario 2 — sign in with a one-time code sent by email (read from the local Mailpit).
import assert from 'node:assert/strict';
import { newIdentity, waitForEmailCode } from '../lib/data.mjs';
import { button, fill, scenario, see } from '../lib/harness.mjs';

scenario('customer: sign in with a 6-digit email code and land on profile setup', async (h) => {
  const me = newIdentity('s2');
  const browser = await h.browser();
  const page = await h.page(browser, 'customer');

  await see(page, 'Good times, anytime.');
  await button(page, 'Email me a code instead').click();
  await fill(page, 'Email', me.email);
  await button(page, 'Email me a code').click();
  await see(page, `We sent a 6-digit code to ${me.email}.`);
  await h.shot(page, 'code-sent');

  const { code } = await waitForEmailCode(me.email);
  assert.match(code, /^\d{6}$/);
  await fill(page, '6-digit code', code);
  await button(page, 'Continue').click();

  await see(page, 'Create your profile');
  await h.shot(page, 'profile-setup');
});
