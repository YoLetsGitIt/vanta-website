// While a client's available times load, the picker must say so clearly and not
// show the month as booked out. Serve out/ first; all remote calls are intercepted.
// VANTA_PLAYWRIGHT_PATH=/path/to/playwright VANTA_BOOKING_TEST_URL=http://127.0.0.1:3018 node scripts/booking-availability-loading-smoke.cjs [shots-dir]
const assert = require('node:assert/strict');
const { chromium } = require(process.env.VANTA_PLAYWRIGHT_PATH || 'playwright');
const base = process.env.VANTA_BOOKING_TEST_URL || 'http://127.0.0.1:3018';
const shots = process.argv[2];
const artist = { id: '11111111-1111-4111-8111-111111111111', name: 'Jamie Lee' };
const user = { id: '22222222-2222-4222-8222-222222222222', email: 'booking@example.test', role: 'authenticated', aud: 'authenticated' };
const auth = { access_token: 't', refresh_token: 'r', expires_at: 2000000000, expires_in: 3600, token_type: 'bearer', user };
const day = date => ({ date, slots: ['10:00', '11:00'], slot_details: ['10:00', '11:00'].map(time => ({ time, starts_at: `${date}T${time}:00+10:00` })), recommended_slots: ['10:00', '11:00'] });
(async () => {
  const browser = await chromium.launch();
  try {
    for (const mode of ['all', 'quieter_days']) {
      const filtered = mode !== 'all';
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, timezoneId: 'Australia/Melbourne' });
      await context.addInitScript(session => localStorage.setItem('sb-aznxvdnpvbcofaqxgmtu-auth-token', JSON.stringify(session)), auth);
      const page = await context.newPage();
      await page.clock.install({ time: new Date('2026-09-09T00:00:00Z') });
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      let release; const held = new Promise(r => { release = r; });
      await page.route('https://aznxvdnpvbcofaqxgmtu.supabase.co/**', route => route.fulfill({ json: user }));
      await page.route('https://inkspire-backend-xa2a.onrender.com/**', async route => {
        const url = new URL(route.request().url());
        if (url.pathname.endsWith('/slots')) {
          await held;
          return route.fulfill({ json: { mode, timezone: 'Australia/Melbourne', filtered_periods: filtered, months: filtered ? ['2026-09'] : [], offer: '', days: ['2026-09-10', '2026-09-12'].map(day) } });
        }
        if (url.pathname === '/booking/test-token') return route.fulfill({ json: {
          booking: { id: 'b', status: 'pending', artist_id: artist.id, duration_minutes: 60, deposit_required: false },
          studio: { name: 'Test studio', timezone: 'Australia/Melbourne', scheduling_mode: mode }, artists: [artist] } });
        return route.fulfill({ json: {} });
      });
      await page.goto(`${base}/booking/_.html?token=test-token`);
      await page.getByRole('heading', { name: 'Choose a date', exact: true }).waitFor();

      // Loading: a clear status naming the artist, and no "booked out" look.
      const status = page.getByRole('status').filter({ hasText: 'Loading Jamie Lee’s times…' });
      await status.waitFor();
      if (!filtered) {
        const grid = page.locator('[aria-busy="true"]');
        assert.equal(await grid.count(), 1, 'Calendar is marked busy');
        const future = page.getByRole('button', { name: '20', exact: true });
        assert.equal(await future.getAttribute('class'), 'booking-loading-tile', 'Future days show the loading state');
        assert.ok(Number(await future.evaluate(el => getComputedStyle(el).opacity)) > 0.4, 'Future days are not faded out as unavailable');
      } else {
        assert.ok(await page.locator('.booking-loading-tile').count() >= 8, 'Placeholder dates while loading');
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth && [...document.querySelectorAll('.booking-loading-tile')].every(el => el.getBoundingClientRect().right <= window.innerWidth)), true, 'Placeholders fit the screen');
      }
      if (shots) { await page.waitForTimeout(4000); await page.screenshot({ path: `${shots}/loading-${mode}.png` }); }

      // Loaded: the status goes, days are bookable or plainly unavailable.
      release();
      await status.waitFor({ state: 'detached' });
      assert.equal(await page.locator('.booking-loading-tile').count(), 0);
      await page.getByRole('button', { name: filtered ? /Thursday,? 10 September/ : '10', exact: true }).click();
      await page.getByRole('button', { name: '10:00 am', exact: true }).waitFor();
      if (shots) await page.screenshot({ path: `${shots}/loaded-${mode}.png` });
      assert.deepEqual(errors, []);
      console.log(`PASS availability loading state (${mode})`);
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
