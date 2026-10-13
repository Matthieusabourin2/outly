// Scenario 7 — the door loses the network: a scan says "No connection" (normal line), and once the
// network is back the same pass goes through.
import { join } from 'node:path';
import { DEMO_PASSWORD, STAFF } from '../lib/env.mjs';
import { createCustomer, joinDemoNight, passCodeOf } from '../lib/data.mjs';
import { allowCameraIfAsked, button, scenario, see, staffLogin, tap } from '../lib/harness.mjs';
import { writeFakeCameraFile } from '../lib/qr.mjs';

const CAMERA_TIMEOUT_MS = 30_000;

scenario('staff: door scan while offline says "No connection", then works when back online', async (h) => {
  const guest = await createCustomer('s7');
  const { client } = await joinDemoNight(guest, 'ghost');
  const { code } = await passCodeOf(client);
  const browser = await h.browser({ camera: writeFakeCameraFile(code, join(h.dir, 'pass.mjpeg')) });

  const door = await h.page(browser, 'door', { site: 'partner', camera: true });
  await staffLogin(door, STAFF.door, DEMO_PASSWORD);
  await see(door, 'On the Outly list');

  // Offline BEFORE the camera opens (the scanner is client-side navigation, the site is already loaded),
  // so the very first read of the pass happens without network.
  await door.context().setOffline(true);
  await tap(door, 'Open door scanner');
  await allowCameraIfAsked(door);
  await see(door, 'No connection', CAMERA_TIMEOUT_MS);
  await see(door, 'Passes can’t be checked right now. Use the normal line.');
  await h.shot(door, 'no-connection');

  // Network back: scan the same pass again.
  await door.context().setOffline(false);
  await button(door, 'Scan next').click();
  await see(door, 'Fast lane OK', CAMERA_TIMEOUT_MS);
  await see(door, `@${guest.username}`);
  await h.shot(door, 'back-online-ok');
});
