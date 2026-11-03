// A studio offered times. The client picks one, and if a deposit is due the next screen
// asks them to pay; nothing is booked until they do. Covers PayID ("I've paid"), card
// (redirect to Stripe), a time taken meanwhile, and scrolling on a short screen.
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
      await c.route('https://checkout.stripe.test/**', route => route.fulfill({ contentType: 'text/html', body: '<h1>Stripe checkout</h1>' }));
      const accepts = []; let booked = null;
      await c.route(`${api}/**`, route => {
        const req = route.request(), url = new URL(req.url());
        if (url.searchParams.get('t') !== 'tok2') return route.fulfill({ status: 404, json: {} });
        if (url.pathname === '/bookings/bk2/proposal') {
          return route.fulfill({ json: booked
            ? { id: 'bk2', status: 'confirmed', chosen_time: booked, session_type: 'small', deposit_required: true, deposit_amount: 80 }
            : { id: 'bk2', status: 'pending', proposed_time_primary: times[0], proposed_time_alt1: times[1], session_type: 'small', deposit_required: true, deposit_amount: 80, deposit_payable: true } });
        }
        if (url.pathname === '/bookings/bk2/proposal/payment') {
          return route.fulfill({ json: { deposit_amount: 80, deposit_options: { card: true, reference: 'VANTA-BK2', manual: { payid: 'bookings@ink.example', payid_name: 'Ink Studio' } } } });
        }
        if (url.pathname === '/bookings/bk2/proposal/accept') {
          const body = req.postDataJSON(); accepts.push(body);
          if (!body.payment) return route.fulfill({ status: 402, json: { code: 'payment_required', error: 'Choose how to pay the deposit' } });
          if (body.chosen_time === times[0]) return route.fulfill({ status: 409, json: { error: 'That time has just been taken. Please choose another time, or contact the studio.' } });
          if (body.payment === 'card') return route.fulfill({ json: { status: 'awaiting_payment', checkout_url: 'https://checkout.stripe.test/pay' } });
          booked = body.chosen_time;
          return route.fulfill({ json: { status: 'confirmed', method: body.payment } });
        }
        return route.fulfill({ status: 404, json: {} });
      });
      const page = await c.newPage();
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.goto(`${base}/bookings/_/confirm?id=bk2&t=tok2`, { waitUntil: 'networkidle' });
      await page.getByRole('heading', { name: 'Choose your time' }).waitFor();
      await page.getByText('$80.00 AUD').waitFor();
      // html/body don't scroll on this site, so the page must scroll itself.
      await page.setViewportSize({ width, height: 520 });
      await page.mouse.move(width / 2, 260); await page.mouse.wheel(0, 2000); await page.waitForTimeout(300);
      assert.ok(await page.evaluate(() => document.querySelector('.page-scroll').scrollTop > 0), 'The time picker scrolls on a short screen');
      await page.setViewportSize({ width, height: 900 });

      // Picking a time saves nothing: the next screen asks for the deposit.
      await page.locator('button[aria-pressed]').nth(0).click();
      await page.getByRole('button', { name: 'Continue to pay deposit' }).click();
      await page.getByRole('heading', { name: 'Pay your deposit' }).waitFor();
      assert.equal(accepts.length, 0, 'Nothing is sent when a time is picked');
      await page.getByRole('button', { name: 'Pay $80.00 by card' }).waitFor();
      await page.getByText('bookings@ink.example').waitFor();
      assert.equal(await page.getByRole('button', { name: 'I’ve paid by bank transfer' }).count(), 0, 'Only the methods the studio offers');

      // The first time was taken meanwhile: back to the times with a notice.
      await page.getByRole('button', { name: 'I’ve paid by PayID' }).click();
      await page.getByRole('alert').filter({ hasText: 'That time has just been taken' }).waitFor();
      await page.getByRole('heading', { name: 'Choose your time' }).waitFor();

      // Card: goes to Stripe with the time chosen; nothing booked yet.
      await page.locator('button[aria-pressed]').nth(1).click();
      await page.getByRole('button', { name: 'Continue to pay deposit' }).click();
      await page.getByRole('button', { name: 'Pay $80.00 by card' }).click();
      await page.waitForURL('https://checkout.stripe.test/pay');
      assert.deepEqual(accepts.at(-1), { chosen_time: times[1], payment: 'card' });
      assert.equal(booked, null);

      // PayID: "I've paid" books the time and confirms it.
      await page.goto(`${base}/bookings/_/confirm?id=bk2&t=tok2`, { waitUntil: 'networkidle' });
      await page.locator('button[aria-pressed]').nth(1).click();
      await page.getByRole('button', { name: 'Continue to pay deposit' }).click();
      await page.getByRole('button', { name: 'I’ve paid by PayID' }).click();
      await page.getByRole('heading', { name: 'Booking confirmed' }).waitFor();
      await page.getByText(/you told the studio you paid the deposit by PayID/).waitFor();
      assert.deepEqual(accepts.at(-1), { chosen_time: times[1], payment: 'payid' });
      assert.equal(await page.getByRole('heading', { name: /Sign in/ }).count(), 0, 'No sign-in at any point');
      assert.equal(await page.evaluate(() => document.querySelector('.page-scroll').scrollWidth <= innerWidth), true);
      assert.deepEqual(errors, []);
      console.log(`PASS studio offer: pick, then pay (PayID / card), taken time, at ${width}px`);
      await c.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
