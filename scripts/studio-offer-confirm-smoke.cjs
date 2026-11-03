// A studio offered times: the client picks one from the email link. With a deposit
// they're sent to the deposit page; if a time was just taken they're asked to pick again.
// Serve out/ first. All backend and auth calls are mocked.
// VANTA_PLAYWRIGHT_PATH=/path/to/playwright VANTA_BOOKING_TEST_URL=http://127.0.0.1:3072 node scripts/studio-offer-confirm-smoke.cjs
const assert = require('node:assert/strict');
const { chromium } = require(process.env.VANTA_PLAYWRIGHT_PATH || 'playwright');
const base = process.env.VANTA_BOOKING_TEST_URL || 'http://127.0.0.1:3072';
const api = 'https://inkspire-backend-xa2a.onrender.com';
const times = ['2099-01-05T00:00:00Z', '2099-01-07T02:00:00Z'];

(async () => {
  const browser = await chromium.launch();
  try {
    for (const width of [390, 1280]) {
      const c = await browser.newContext({ viewport: { width, height: 900 } });
      await c.route('https://aznxvdnpvbcofaqxgmtu.supabase.co/**', route => route.fulfill({ status: 401, json: {} }));
      const accepts = []; let claimed = null;
      await c.route(`${api}/**`, route => {
        const req = route.request(), url = new URL(req.url());
        if (url.pathname === '/bookings/bk2/proposal' && url.searchParams.get('t') === 'tok2') {
          return route.fulfill({ json: { id: 'bk2', status: 'pending', proposed_time_primary: times[0], proposed_time_alt1: times[1], session_type: 'small', deposit_required: true, deposit_amount: 80, deposit_payable: true } });
        }
        if (url.pathname === '/bookings/bk2/proposal/accept' && url.searchParams.get('t') === 'tok2') {
          const body = req.postDataJSON(); accepts.push(body);
          if (body.chosen_time === times[0]) return route.fulfill({ status: 409, json: { error: 'That time has just been taken. Please choose another time, or contact the studio.' } });
          return route.fulfill({ json: { status: 'awaiting_payment', deposit_url: `${base}/booking/_?token=dep-token` } });
        }
        if (url.pathname === '/booking/dep-token') return route.fulfill({ json: { booking: {
          id: 'bk2', status: claimed ? 'confirmed' : 'awaiting_payment', chosen_time: times[1], deposit_required: true, deposit_amount: 80,
          deposit_payable: !claimed, guest_allowed: true, ...(claimed ? { deposit_claim: { method: 'payid', recorded_at: new Date().toISOString() } } : {}),
          deposit_options: { card: false, reference: 'VANTA-BK2', manual: { payid: 'bookings@ink.example', payid_name: 'Ink Studio' } },
        }, studio: { name: 'Test studio', timezone: 'Australia/Melbourne' }, artists: [] } });
        if (url.pathname === '/booking/dep-token/deposit-sent') { claimed = req.postDataJSON(); return route.fulfill({ json: { status: 'confirmed', method: claimed.method } }); }
        return route.fulfill({ status: 404, json: {} });
      });
      const page = await c.newPage();
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.goto(`${base}/bookings/_/confirm?id=bk2&t=tok2`, { waitUntil: 'networkidle' });
      await page.getByRole('heading', { name: 'Choose your time' }).waitFor();
      await page.getByText('$80.00 AUD').waitFor();
      await page.getByText(/go to the payment page to pay the deposit/).waitFor();

      // The first time was taken meanwhile: stay on the page and ask for another.
      const options = page.locator('button[aria-pressed]');
      assert.equal(await options.count(), 2);
      await options.nth(0).click();
      await page.getByRole('button', { name: 'Confirm & pay $80.00' }).click();
      await page.getByRole('alert').filter({ hasText: 'That time has just been taken' }).waitFor();
      await page.getByRole('heading', { name: 'Choose your time' }).waitFor();

      // Picking the other time goes to the deposit page.
      await page.locator('button[aria-pressed]').nth(1).click();
      await page.getByRole('button', { name: 'Confirm & pay $80.00' }).click();
      await page.waitForURL(/\/booking\/_\?token=dep-token/);

      // Deposit page: no sign-in; the client pays by PayID and says so, which confirms it.
      await page.getByRole('heading', { name: 'Pay deposit' }).waitFor();
      assert.equal(await page.getByRole('heading', { name: /Sign in/ }).count(), 0, 'No sign-in for the deposit');
      await page.getByText('bookings@ink.example').waitFor();
      assert.equal(await page.getByRole('button', { name: 'I’ve paid by bank transfer' }).count(), 0, 'Only the methods the studio offers');
      await page.getByRole('button', { name: 'I’ve paid by PayID' }).click();
      await page.getByRole('heading', { name: 'Booking confirmed' }).waitFor();
      await page.getByText(/you told the studio you paid the \$80\.00 deposit by PayID/).waitFor();
      assert.deepEqual(claimed, { method: 'payid' });
      assert.deepEqual(accepts.map(a => a.chosen_time), times);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      assert.deepEqual(errors.filter(e => !/Loading chunk|ChunkLoad/.test(e)), []);
      console.log(`PASS studio offer: taken time, then deposit page, at ${width}px`);
      await c.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
