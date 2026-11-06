// Scenario 6 — after the night: Night says "This night is over" (no Join button) and the pass is no longer shown.
// Temporarily moves the demo event into the past, then restores the exact original times.
import assert from 'node:assert/strict';
import { DEMO_EVENT, adminClient } from '../lib/env.mjs';
import { createCustomer, joinDemoNight } from '../lib/data.mjs';
import { button, customerLogin, scenario, see, tab } from '../lib/harness.mjs';

scenario('customer: a night that is over shows "This night is over", no Join button, no pass', async (h) => {
  const admin = adminClient();
  const { data: original, error } = await admin.from('events').select('starts_at, ends_at').eq('id', DEMO_EVENT).single();
  assert.ifError(error);

  const viewer = await createCustomer('s6v');
  const holder = await createCustomer('s6h');
  await joinDemoNight(holder, 'ghost');

  const now = Date.now();
  try {
    // Both moved into the past (events require ends_at > starts_at).
    const { error: e } = await admin
      .from('events')
      .update({ starts_at: new Date(now - 10 * 3600_000).toISOString(), ends_at: new Date(now - 4 * 3600_000).toISOString() })
      .eq('id', DEMO_EVENT);
    assert.ifError(e);

    const browser = await h.browser();
    const pv = await h.page(browser, 'viewer');
    await customerLogin(pv, viewer);
    await see(pv, 'This night is over');
    await see(pv, 'On the Outly list');
    assert.equal(await button(pv, 'Join the Outly list').count(), 0, 'no Join button after the night');
    await h.shot(pv, 'night-over');

    const ph = await h.page(browser, 'holder');
    await customerLogin(ph, holder);
    await see(ph, 'This night is over');
    await tab(ph, 'Pass').click();
    await see(ph, 'Your pass is no longer valid. See you at the next Outly night.');
    await h.shot(ph, 'pass-over');
  } finally {
    const { error: e } = await admin.from('events').update({ starts_at: original.starts_at, ends_at: original.ends_at }).eq('id', DEMO_EVENT);
    if (e) throw e;
  }
  const { data: restored } = await admin.from('events').select('starts_at, ends_at').eq('id', DEMO_EVENT).single();
  assert.deepEqual(restored, original, 'the demo event times are restored exactly');
});
