// Serve out/ locally first: python3 -m http.server 3062 --directory out
// All backend and auth requests are intercepted.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.VANTA_PLAYWRIGHT_PATH || 'playwright');
const base = process.env.VANTA_WEBSITE_TEST_URL || 'http://127.0.0.1:3062';
const shots = process.env.VANTA_SCREENSHOT_DIR;
const user = { id: '22222222-2222-4222-8222-222222222222', email: 'client@example.test', role: 'authenticated', aud: 'authenticated', user_metadata: {} };
const auth = { access_token: 't', refresh_token: 'r', expires_at: 2000000000, expires_in: 3600, token_type: 'bearer', user };
const manual = { payid: 'bookings@ink.example', payid_name: 'Ink Studio', bank_account_name: 'Ink Pty Ltd', bank_bsb: '062-000', bank_account_number: '12345678' };
const chosen = new Date(Date.now() + 5 * 86400000).toISOString();

function context(booking) {
  return { booking: { id: 'b1', status: 'awaiting_payment', chosen_time: chosen, deposit_required: true, deposit_payable: true, deposit_amount: 150, artist_id: 'a1', ...booking }, studio: { id: 's1', name: 'Ink Studio', timezone: 'Australia/Melbourne' }, artists: [{ id: 'a1', name: 'Jo' }] };
}

async function open(browser, width, ctx) {
  const c = await browser.newContext({ viewport: { width, height: 1000 } });
  await c.addInitScript(session => localStorage.setItem('sb-aznxvdnpvbcofaqxgmtu-auth-token', JSON.stringify(session)), auth);
  const calls = [];
  await c.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin === new URL(base).origin) return route.continue();
    calls.push(route.request().method() + ' ' + url.pathname);
    if (url.pathname === '/booking/tok') return route.fulfill({ json: ctx });
    if (url.pathname === '/booking/tok/checkout') return route.fulfill({ json: { checkout_url: base + '/stripe-checkout-stub' } });
    if (url.pathname === '/auth/v1/user') return route.fulfill({ json: user });
    return route.fulfill({ json: {} });
  });
  const page = await c.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${base}/booking/_.html?token=tok`, { waitUntil: 'networkidle' });
  return { c, page, errors, calls };
}

(async () => {
  const browser = await chromium.launch();
  try {
    for (const width of [390, 1280]) {
      // PayID + bank only: no card button, details and reference shown.
      {
        const { c, page, errors } = await open(browser, width, context({ deposit_options: { card: false, manual, reference: 'VANTA-1D4B9F5B' } }));
        await page.getByRole('heading', { name: 'Pay deposit' }).waitFor();
        assert.equal(await page.getByRole('button', { name: /Pay deposit/ }).count(), 0);
        for (const text of ['bookings@ink.example', '062-000', '12345678', 'VANTA-1D4B9F5B', '$150.00']) await page.getByText(text, { exact: true }).first().waitFor();
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        assert.ok(overflow <= 0, `overflow ${overflow}px at ${width}`);
        if (shots) { await page.waitForTimeout(5000); await page.screenshot({ path: `${shots}/manual-only-${width}.png`, fullPage: true }); }
        assert.equal(errors.length, 0, errors.join('\n'));
        console.log(`PASS manual-only deposit page at ${width}px`);
        await c.close();
      }
      // Stripe + manual: card button plus alternatives.
      {
        const { c, page, errors, calls } = await open(browser, width, context({ deposit_options: { card: true, manual, reference: 'VANTA-1D4B9F5B' } }));
        await page.getByRole('button', { name: 'Pay deposit by card' }).waitFor();
        await page.getByText('Or pay by PayID or bank transfer:').waitFor();
        await page.getByText('bookings@ink.example', { exact: true }).waitFor();
        await page.getByRole('button', { name: 'Pay deposit by card' }).click();
        await page.waitForURL(/stripe-checkout-stub/);
        assert.ok(calls.includes('POST /booking/tok/checkout'));
        assert.equal(errors.length, 0, errors.join('\n'));
        console.log(`PASS card + manual deposit page at ${width}px`);
        await c.close();
      }
    }
    // Older backend (no deposit_options): unchanged Stripe button.
    {
      const { c, page } = await open(browser, 390, context({}));
      await page.getByRole('button', { name: 'Pay deposit', exact: true }).waitFor();
      console.log('PASS unchanged when deposit_options is missing');
      await c.close();
    }
    // Requested a time with no Stripe: receipt shows how to pay.
    {
      const { c, page } = await open(browser, 390, context({ status: 'requires_confirmation', deposit_payable: false, deposit_options: { card: false, manual: { payid: '0400 111 222' }, reference: 'VANTA-1D4B9F5B' } }));
      await page.getByRole('heading', { name: 'Appointment requested' }).waitFor();
      await page.getByText('0400 111 222', { exact: true }).waitFor();
      assert.equal(await page.getByText('Pay by bank transfer').count(), 0);
      if (shots) { await page.waitForTimeout(5000); await page.screenshot({ path: `${shots}/requested-payid.png`, fullPage: true }); }
      console.log('PASS requested appointment shows PayID details');
      await c.close();
    }
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
