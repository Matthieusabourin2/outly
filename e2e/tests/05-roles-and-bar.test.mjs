// Scenario 5 — staff roles (door: Tonight + Door, bar: Tonight + Bar, manager: all three)
// and the bar scan of the Outly drinks offer: off by default, then switched on, redeemed once.
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { DEMO_OFFER, DEMO_PASSWORD, STAFF, adminClient } from '../lib/env.mjs';
import { createCustomer, joinDemoNight, passCodeOf } from '../lib/data.mjs';
import { allowCameraIfAsked, button, scenario, see, staffLogin, tab } from '../lib/harness.mjs';
import { writeFakeCameraFile } from '../lib/qr.mjs';

const CAMERA_TIMEOUT_MS = 30_000;
const TABS = ['Tonight', 'Door', 'Bar'];

async function visibleTabs(page) {
  await tab(page, 'Tonight').waitFor();
  const shown = [];
  for (const name of TABS) if ((await tab(page, name).count()) > 0) shown.push(name);
  return shown;
}

async function setOfferStatus(status) {
  const { data, error } = await adminClient().from('deals').update({ status }).eq('id', DEMO_OFFER).select('status');
  if (error || data.length !== 1) throw new Error(`Could not set the demo offer to ${status}: ${error?.message ?? 'not found'}`);
}

scenario('staff: tabs by role, bar offer off → on → redeemed once', async (h) => {
  const admin = adminClient();
  const { data: before } = await admin.from('deals').select('status, title').eq('id', DEMO_OFFER).single();
  assert.equal(before.status, 'draft', 'the demo Outly drinks offer starts switched off');

  const guest = await createCustomer('s5');
  const { client } = await joinDemoNight(guest, 'classic');
  const { booking, code } = await passCodeOf(client);
  const browser = await h.browser({ camera: writeFakeCameraFile(code, join(h.dir, 'pass.mjpeg')) });

  // Tabs per role.
  const door = await h.page(browser, 'door', { site: 'partner', camera: true });
  await staffLogin(door, STAFF.door, DEMO_PASSWORD);
  assert.deepEqual(await visibleTabs(door), ['Tonight', 'Door']);
  await h.shot(door, 'door-tabs');

  const manager = await h.page(browser, 'manager', { site: 'partner', camera: true });
  await staffLogin(manager, STAFF.manager, DEMO_PASSWORD);
  assert.deepEqual(await visibleTabs(manager), ['Tonight', 'Door', 'Bar']);
  await h.shot(manager, 'manager-tabs');

  const bar = await h.page(browser, 'bar', { site: 'partner', camera: true });
  await staffLogin(bar, STAFF.bar, DEMO_PASSWORD);
  await see(bar, 'OUTLY STAFF · BAR STAFF');
  assert.deepEqual(await visibleTabs(bar), ['Tonight', 'Bar']);
  assert.equal(await button(bar, 'Open door scanner').count(), 0, 'bar staff has no door scanner');

  // Offer off: nothing to scan at the bar.
  await tab(bar, 'Bar').click();
  await see(bar, 'No Outly drinks offer tonight');
  await h.shot(bar, 'bar-offer-off');

  try {
    await setOfferStatus('active');
    // Back to Tonight and to Bar again: the screens reload when focused.
    await tab(bar, 'Tonight').click();
    await see(bar, `Bar scanner · ${before.title}`);
    await tab(bar, 'Bar').click();
    await allowCameraIfAsked(bar);
    await see(bar, 'Offer OK', CAMERA_TIMEOUT_MS);
    await see(bar, `@${guest.username}`);
    await see(bar, before.title);
    await see(bar, 'Apply the Outly offer to this order.');
    await h.shot(bar, 'offer-ok');

    await button(bar, 'Scan next').click({ timeout: 3_000 }).catch(() => {});
    await see(bar, 'Offer already used', CAMERA_TIMEOUT_MS);
    await see(bar, 'This pass has already used tonight’s offer.');
    await h.shot(bar, 'offer-already-used');

    const { data: redemptions } = await admin.from('offer_redemptions').select('id').eq('deal_id', DEMO_OFFER).eq('booking_id', booking.id);
    assert.equal(redemptions.length, 1, 'one redemption for this pass');
  } finally {
    await setOfferStatus('draft');
  }
  const { data: after } = await admin.from('deals').select('status').eq('id', DEMO_OFFER).single();
  assert.equal(after.status, 'draft', 'the demo offer is switched off again');
});
