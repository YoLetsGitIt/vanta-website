// The client's reschedule link after asking for a new time: choose one of the times the
// studio offered, or ask for a particular time. All backend calls are mocked.
// VANTA_PLAYWRIGHT_PATH=/path/to/playwright VANTA_BOOKING_TEST_URL=http://127.0.0.1:3072 node scripts/reschedule-respond-smoke.cjs
const assert = require('node:assert/strict');
const { chromium } = require(process.env.VANTA_PLAYWRIGHT_PATH || 'playwright');
const base = process.env.VANTA_BOOKING_TEST_URL || 'http://127.0.0.1:3072';
const shots = process.env.VANTA_SCREENSHOT_DIR;
const api = 'https://inkspire-backend-xa2a.onrender.com';
const id = 'bbbbbbbb-1111-4222-8333-444444444444';

(async () => {
  const browser = await chromium.launch();
  try {
    // Offered times: choose one.
    {
      const c = await browser.newContext({ viewport: { width: 390, height: 844 } });
      let moved;
      await c.route(`${api}/**`, route => {
        const req = route.request(), path = new URL(req.url()).pathname;
        if (path === `/bookings/${id}/reschedule`) return route.fulfill({ json: { allowed: true, mode: 'choose', timezone: 'Australia/Sydney', chosen_time: '2026-12-01T10:00:00+11:00',
          offered: ['2026-12-03T11:00:00+11:00', '2026-12-04T14:30:00+11:00'] } });
        if (path === `/bookings/${id}/client-reschedule`) { moved = req.postDataJSON(); return route.fulfill({ json: { status: 'confirmed' } }); }
        return route.fulfill({ json: {} });
      });
      const page = await c.newPage();
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.goto(`${base}/bookings/_/reschedule?id=${id}&t=tok`, { waitUntil: 'networkidle' });
      await page.getByRole('heading', { name: 'Choose a new time' }).waitFor();
      const options = page.getByRole('button', { pressed: false }).filter({ hasText: /Dec/ });
      assert.equal(await options.count(), 2, 'Both offered times');
      if (shots) await page.screenshot({ path: `${shots}/reschedule-choose.png`, fullPage: true });
      await options.nth(1).click();
      await page.getByRole('button', { name: /^Move to/ }).click();
      await page.getByRole('heading', { name: 'Booking moved' }).waitFor();
      assert.equal(moved.start_time, '2026-12-04T14:30:00+11:00');
      assert.deepEqual(errors, []);
      console.log('PASS choose an offered time');
      await c.close();
    }
    // Asking: a particular time in the studio's zone, plus a note.
    {
      const c = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'America/New_York' });
      let asked;
      await c.route(`${api}/**`, route => {
        const req = route.request(), path = new URL(req.url()).pathname;
        if (path === `/bookings/${id}/reschedule`) return route.fulfill({ json: { allowed: true, mode: 'request', timezone: 'Australia/Sydney', chosen_time: '2026-12-01T10:00:00+11:00' } });
        if (path === `/bookings/${id}/reschedule-request`) { asked = req.postDataJSON(); return route.fulfill({ json: { status: 'requested' } }); }
        return route.fulfill({ json: {} });
      });
      const page = await c.newPage();
      await page.goto(`${base}/bookings/_/reschedule?id=${id}&t=tok`, { waitUntil: 'networkidle' });
      await page.getByRole('heading', { name: 'Ask for a new time' }).waitFor();
      await page.getByLabel('Preferred date').fill('2026-12-05');
      assert(await page.getByRole('button', { name: 'Ask for a new time' }).isDisabled(), 'A date needs a time');
      await page.getByLabel('Preferred time').fill('13:00');
      await page.locator('#msg').fill('Saturday works best');
      if (shots) await page.screenshot({ path: `${shots}/reschedule-ask.png`, fullPage: true });
      await page.getByRole('button', { name: 'Ask for a new time' }).click();
      await page.getByRole('heading', { name: 'Request sent' }).waitFor();
      // 1pm Sydney (UTC+11 in December), whatever the client's own zone.
      assert.equal(asked.preferred_time, '2026-12-05T02:00:00.000Z');
      assert.equal(asked.message, 'Saturday works best');
      console.log('PASS ask for a particular time');
      await c.close();
    }
  } finally {
    await browser.close();
  }
})().catch(err => { console.error(err); process.exit(1); });
