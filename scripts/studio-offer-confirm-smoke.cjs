// A studio offered times. The client picks one, and if a deposit is due the next screen
// asks them to pay it by card (Stripe, the only way since 2026-11-25); nothing is booked
// until they do. Covers the Vanta booking fee and total, the card redirect, a time taken
// meanwhile, the studio covering the fee, and scrolling on a short screen.
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
      const accepts = []; let booked = null; let absorbed = false;
      await c.route(`${api}/**`, route => {
        const req = route.request(), url = new URL(req.url());
        if (url.searchParams.get('t') !== 'tok2') return route.fulfill({ status: 404, json: {} });
        if (url.pathname === '/bookings/bk2/proposal') {
          return route.fulfill({ json: booked
            ? { id: 'bk2', status: 'confirmed', chosen_time: booked, session_type: 'small', deposit_required: true, deposit_amount: 80 }
            : { id: 'bk2', status: 'pending', proposed_time_primary: times[0], proposed_time_alt1: times[1], session_type: 'small', deposit_required: true, deposit_amount: 80, deposit_payable: true } });
        }
        if (url.pathname === '/bookings/bk2/proposal/payment') {
          // The server's amounts: 3% + 50c, or covered by the studio.
          return route.fulfill({ json: { deposit_amount: 80, deposit_options: absorbed
            ? { card: true, fee_absorbed: true, booking_fee: 0, total: 80 }
            : { card: true, booking_fee: 2.9, total: 82.9 } } });
        }
        if (url.pathname === '/bookings/bk2/proposal/accept') {
          const body = req.postDataJSON(); accepts.push(body);
          if (!body.payment) return route.fulfill({ status: 402, json: { code: 'payment_required', error: 'Choose how to pay the deposit' } });
          if (body.chosen_time === times[0]) return route.fulfill({ status: 409, json: { error: 'That time has just been taken. Please choose another time, or contact the studio.' } });
          return route.fulfill({ json: { status: 'awaiting_payment', checkout_url: 'https://checkout.stripe.test/pay' } });
        }
        return route.fulfill({ status: 404, json: {} });
      });
      const page = await c.newPage();
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.goto(`${base}/bookings/_/confirm?id=bk2&t=tok2`, { waitUntil: 'networkidle' });
      await page.getByRole('heading', { name: 'Choose your time' }).waitFor();
      // The deposit, the Vanta booking fee and the total, before anything is paid.
      await page.getByText('Vanta booking fee', { exact: true }).waitFor();
      await page.getByText('$2.90', { exact: true }).waitFor();
      await page.getByText('$82.90 AUD').waitFor();
      // html/body don't scroll on this site, so the page must scroll itself.
      await page.setViewportSize({ width, height: 520 });
      await page.mouse.move(width / 2, 260); await page.mouse.wheel(0, 2000); await page.waitForTimeout(300);
      assert.ok(await page.evaluate(() => document.querySelector('.page-scroll').scrollTop > 0), 'The time picker scrolls on a short screen');
      await page.setViewportSize({ width, height: 900 });

      // Picking a time saves nothing: the next screen asks for the deposit, by card only.
      await page.locator('button[aria-pressed]').nth(0).click();
      await page.getByRole('button', { name: 'Continue to pay deposit' }).click();
      await page.getByRole('heading', { name: 'Pay your deposit' }).waitFor();
      assert.equal(accepts.length, 0, 'Nothing is sent when a time is picked');
      const pay = page.getByRole('button', { name: 'Pay $82.90' });
      await pay.waitFor();
      assert.equal(await page.getByRole('button', { name: /I’ve paid/ }).count(), 0, 'No PayID or bank transfer: deposits are Stripe only');

      // The first time was taken meanwhile: back to the times with a notice.
      await pay.click();
      await page.getByRole('alert').filter({ hasText: 'That time has just been taken' }).waitFor();
      await page.getByRole('heading', { name: 'Choose your time' }).waitFor();
      assert.deepEqual(accepts.at(-1), { chosen_time: times[0], payment: 'card' });

      // Card: goes to Stripe with the time chosen; nothing is booked until it's paid.
      await page.locator('button[aria-pressed]').nth(1).click();
      await page.getByRole('button', { name: 'Continue to pay deposit' }).click();
      await page.getByRole('button', { name: 'Pay $82.90' }).click();
      await page.waitForURL('https://checkout.stripe.test/pay');
      assert.deepEqual(accepts.at(-1), { chosen_time: times[1], payment: 'card' });
      assert.equal(booked, null);

      // The studio covers the booking fee: the client pays the deposit only.
      absorbed = true;
      await page.goto(`${base}/bookings/_/confirm?id=bk2&t=tok2`, { waitUntil: 'networkidle' });
      await page.getByText('Covered', { exact: true }).waitFor();
      await page.getByText('$80.00 AUD').waitFor();
      await page.locator('button[aria-pressed]').nth(1).click();
      await page.getByRole('button', { name: 'Continue to pay deposit' }).click();
      await page.getByRole('button', { name: 'Pay $80.00' }).waitFor();

      assert.equal(await page.getByRole('heading', { name: /Sign in/ }).count(), 0, 'No sign-in at any point');
      assert.equal(await page.evaluate(() => document.querySelector('.page-scroll').scrollWidth <= innerWidth), true);
      assert.deepEqual(errors, []);
      console.log(`PASS studio offer: pick, then pay by card (fee shown or covered), taken time, at ${width}px`);
      await c.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
