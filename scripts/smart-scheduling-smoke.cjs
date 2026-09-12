// Build first, then serve out/ locally. No live booking, payment or auth calls.
// VANTA_PLAYWRIGHT_PATH=/path/to/playwright VANTA_BOOKING_TEST_URL=http://127.0.0.1:3018 node scripts/smart-scheduling-smoke.cjs
const assert = require('node:assert/strict');
const { chromium } = require(process.env.VANTA_PLAYWRIGHT_PATH || 'playwright');
const base = process.env.VANTA_BOOKING_TEST_URL || 'http://127.0.0.1:3018';
const artist = { id: '11111111-1111-4111-8111-111111111111', name: 'Test artist' };
const user = { id: '22222222-2222-4222-8222-222222222222', email: 'booking@example.test', role: 'authenticated', aud: 'authenticated' };
const auth = { access_token: 'test-access-token', refresh_token: 'test-refresh-token', expires_at: 2000000000, expires_in: 3600, token_type: 'bearer', user };
const day = (date, mode) => ({
  date,
  slots: ['09:00', '10:00', '11:00', '12:00', '13:00'],
  slot_details: ['09:00', '10:00', '11:00', '12:00', '13:00'].map(time => ({ time, starts_at: `${date}T${time}:00+10:00` })),
  recommended_slots: (['all', 'quieter_days', 'quieter_months', 'quieter_days_only'].includes(mode)) ? ['09:00', '10:00', '11:00', '12:00', '13:00'] : ['10:00', '11:00', '12:00'],
});
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const mode of ['all', 'quieter_days', 'minimize_gaps', 'combined', 'quieter_months', 'quieter_days_only', 'quieter_months_gaps', 'quieter_days_gaps']) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'America/Los_Angeles' });
      await context.addInitScript(session => localStorage.setItem('sb-aznxvdnpvbcofaqxgmtu-auth-token', JSON.stringify(session)), auth);
      const page = await context.newPage();
      // In all mode, Melbourne is in September while the LA browser is in August.
      await page.clock.install({ time: new Date(mode === 'all' ? '2026-08-31T15:00:00Z' : '2026-09-09T00:00:00Z') });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      let failAvailability = false;
      let selectedBody;
      let slotRequests = 0;
      let expireOffer = false;
      let emptyPeriods = false;
      const filtered = !['all', 'minimize_gaps'].includes(mode);
      await page.route('https://aznxvdnpvbcofaqxgmtu.supabase.co/**', route => route.fulfill({ json: user }));
      await page.route('https://inkspire-backend-xa2a.onrender.com/**', async route => {
        const url = new URL(route.request().url());
        if (url.pathname.endsWith('/slots')) {
          slotRequests++;
          assert.equal(url.searchParams.get('view'), 'periods');
          assert.equal(url.searchParams.get('artist_id'), artist.id);
          assert.ok(Number(url.searchParams.get('days')) <= 31);
          if (failAvailability) return route.fulfill({ status: 503, json: { error: 'Availability could not be checked. Please try again.' } });
          const month = url.searchParams.get('date').slice(0, 7);
          return route.fulfill({ json: { mode, timezone: 'Australia/Melbourne', filtered_periods: filtered,
            months: filtered && !emptyPeriods ? ['2026-09', '2026-10'] : [], offer: filtered ? `synthetic-offer-${slotRequests}` : '',
            days: emptyPeriods ? [] : filtered ? ['2026-09-10', '2026-09-12', '2026-10-10'].map(date => day(date, mode)) : [10, 11, 12].map(n => day(`${month}-${n}`, mode)) } });
        }
        if (url.pathname.endsWith('/select')) {
          selectedBody = route.request().postDataJSON();
          if (expireOffer) { expireOffer = false; return route.fulfill({ status: 409, json: { code: 'availability_changed', error: 'Your available dates have changed. Please choose from the updated options.' } }); }
          return route.fulfill({ json: { status: 'confirmed' } });
        }
        if (url.pathname === '/booking/test-token') return route.fulfill({ json: {
          booking: { id: 'test-booking', status: 'pending', artist_id: artist.id, duration_minutes: 60, deposit_required: false },
          studio: { name: 'Test studio', timezone: 'Australia/Melbourne', scheduling_mode: mode }, artists: [artist],
        } });
        return route.fulfill({ json: {} });
      });
      await page.goto(`${base}/booking/_.html?token=test-token`, { waitUntil: 'networkidle' });
      await page.getByRole('heading', { name: 'Choose a date', exact: true }).waitFor();
      await page.getByText('All times are shown in Australia/Melbourne.').waitFor();
      const selectDate = () => page.getByRole('button', { name: filtered ? /Thursday,? 10 September/ : '10', exact: true }).click();
      if (filtered) {
        assert.equal(await page.getByRole('button', { name: 'Next month', exact: true }).count(), 0);
        assert.equal(await page.getByRole('button', { name: 'November 2026', exact: true }).count(), 0);
        assert.equal(await page.getByRole('button', { name: /Friday,? 11 September/, exact: true }).count(), 0);
        const before = slotRequests;
        await page.getByRole('button', { name: 'October 2026', exact: true }).click();
        await page.getByRole('button', { name: /Saturday,? 10 October/, exact: true }).waitFor();
        await page.getByRole('button', { name: 'September 2026', exact: true }).click();
        assert.equal(slotRequests, before, 'Month choices must keep the same signed offer');
      }
      await selectDate();
      if (['all', 'quieter_days', 'quieter_months', 'quieter_days_only'].includes(mode)) {
        await page.getByRole('button', { name: '9:00 am', exact: true }).waitFor();
        assert.equal(await page.getByRole('button', { name: 'Show all times', exact: true }).count(), 0);
      } else {
        assert.equal(await page.getByRole('button', { name: '9:00 am', exact: true }).count(), 0);
        await page.getByRole('button', { name: 'Show all times', exact: true }).click();
        await page.getByRole('button', { name: '9:00 am', exact: true }).waitFor();
        await page.getByRole('button', { name: 'Show suggested times', exact: true }).click();
        assert.equal(await page.getByRole('button', { name: '9:00 am', exact: true }).count(), 0);
      }
      await page.screenshot({ path: `/private/tmp/vanta-booking-times-${mode}.png`, fullPage: true });
      if (!filtered) {
        // A failed refresh must clear old options and offer a retry.
        failAvailability = true;
        await page.getByRole('button', { name: 'Next month', exact: true }).click();
        await page.getByRole('button', { name: 'Try again', exact: true }).waitFor();
        assert.equal(await page.getByRole('button', { name: '10:00 am', exact: true }).count(), 0);
        failAvailability = false;
        await page.getByRole('button', { name: 'Try again', exact: true }).click();
        await page.getByRole('button', { name: 'Previous month', exact: true }).click();
        await selectDate();
      }
      await page.getByRole('button', { name: '10:00 am', exact: true }).click();
      await page.getByRole('button', { name: 'Continue', exact: true }).click();
      await page.getByRole('heading', { name: 'Confirm your appointment', exact: true }).waitFor();
      // Despite an LA browser, confirmation and submission retain Melbourne time.
      assert.ok(await page.getByText(/10 September 2026.*10:00 am/).count());
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
      await page.screenshot({ path: `/private/tmp/vanta-booking-${mode}.png`, fullPage: true });
      const confirm = page.getByRole('button', { name: 'Request appointment', exact: true });
      if (await confirm.count()) {
        expireOffer = filtered;
        await Promise.all([page.waitForResponse(response => response.url().endsWith('/select')), confirm.click()]);
        if (filtered) {
          assert.equal(selectedBody.offer, 'synthetic-offer-1');
          await page.getByRole('heading', { name: 'Choose a date', exact: true }).waitFor();
          await page.getByText('Your available dates have changed. Please choose from the updated options.').waitFor();
          await selectDate();
          await page.getByRole('button', { name: '10:00 am', exact: true }).click();
          await page.getByRole('button', { name: 'Continue', exact: true }).click();
          await Promise.all([page.waitForResponse(response => response.url().endsWith('/select')), confirm.click()]);
          assert.equal(selectedBody.offer, 'synthetic-offer-2');
        }
        assert.equal(selectedBody.chosen_time, '2026-09-10T00:00:00.000Z');
      } else throw new Error('Missing booking confirmation action');
      if (filtered) {
        emptyPeriods = true;
        await page.reload({ waitUntil: 'networkidle' });
        await page.getByText('No available booking dates in the next 90 days. Please contact the studio.').waitFor();
        assert.equal(await page.getByRole('button', { name: 'Next month', exact: true }).count(), 0);
        assert.equal(await page.getByRole('button', { name: 'September 2026', exact: true }).count(), 0);
      }
      assert.deepEqual(errors, []);
      await context.close();
      console.log(`${mode}: mobile booking, expansion, retry, timezone and submission passed`);
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
