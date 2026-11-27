// The "Confirm booking" link from an offered-times email. The client can always press
// Confirm: with one time it's already chosen; with several, pressing before picking says
// to choose a time first. The quote shows as an estimate with the session length.
// Serve out/ first. All backend and auth calls are mocked.
// VANTA_PLAYWRIGHT_PATH=/path/to/playwright VANTA_BOOKING_TEST_URL=http://127.0.0.1:3072 node scripts/proposal-confirm-smoke.cjs
const assert = require('node:assert/strict');
const { chromium } = require(process.env.VANTA_PLAYWRIGHT_PATH || 'playwright');
const base = process.env.VANTA_BOOKING_TEST_URL || 'http://127.0.0.1:3072';
const api = 'https://inkspire-backend-xa2a.onrender.com';
const times = ['2099-01-05T00:00:00Z', '2099-01-07T02:00:00Z'];

async function open(browser, width, offered) {
  const c = await browser.newContext({ viewport: { width, height: 900 }, isMobile: width < 800, hasTouch: width < 800 });
  await c.route('https://aznxvdnpvbcofaqxgmtu.supabase.co/**', route => route.fulfill({ status: 401, json: {} }));
  const accepts = []; let booked = null;
  await c.route(`${api}/**`, route => {
    const req = route.request(), url = new URL(req.url());
    if (url.pathname === '/bookings/bk3/proposal') {
      return route.fulfill({ json: booked
        ? { id: 'bk3', status: 'confirmed', chosen_time: booked, session_type: 'small' }
        : { id: 'bk3', status: 'pending', proposed_time_primary: offered[0], proposed_time_alt1: offered[1] ?? null, session_type: 'small', estimated_quote: 400, proposed_duration_minutes: 150 } });
    }
    if (url.pathname === '/bookings/bk3/proposal/accept') {
      const body = req.postDataJSON(); accepts.push(body); booked = body.chosen_time;
      return route.fulfill({ json: { status: 'confirmed' } });
    }
    return route.fulfill({ status: 404, json: {} });
  });
  const page = await c.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${base}/bookings/_/confirm?id=bk3&t=tok3`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Choose your time' }).waitFor();
  return { c, page, accepts, errors };
}

(async () => {
  const browser = await chromium.launch();
  try {
    for (const width of [390, 1280]) {
      // Two times: Confirm is pressable, and says to pick a time first.
      let { c, page, accepts, errors } = await open(browser, width, times);
      await page.getByText('$400.00').waitFor();
      await page.getByText('estimate only').waitFor();
      await page.getByText('2 hrs 30 min').waitFor();
      const confirm = page.getByRole('button', { name: 'Confirm booking' });
      assert.equal(await confirm.isEnabled(), true, 'Confirm is never a dead button');
      await confirm.click();
      await page.getByRole('alert').filter({ hasText: 'Choose one of the times above first.' }).waitFor();
      assert.equal(accepts.length, 0, 'Nothing is sent without a time');
      assert.equal(await page.evaluate(() => document.activeElement?.classList.contains('proposal-time')), true, 'Focus moves to the times');
      await page.locator('button[aria-pressed]').nth(1).click();
      assert.equal(await page.getByRole('alert').filter({ hasText: 'Choose one of the times' }).count(), 0, 'The hint goes once a time is chosen');
      await confirm.click();
      await page.getByRole('heading', { name: 'Booking confirmed' }).waitFor();
      assert.deepEqual(accepts.map(a => a.chosen_time), [times[1]]);
      assert.deepEqual(errors, []);
      await c.close();

      // One time: it's already chosen, so Confirm books it straight away.
      ({ c, page, accepts, errors } = await open(browser, width, times.slice(0, 1)));
      assert.equal(await page.locator('button[aria-pressed="true"]').count(), 1, 'The only time is preselected');
      await page.getByRole('button', { name: 'Confirm booking' }).click();
      await page.getByRole('heading', { name: 'Booking confirmed' }).waitFor();
      assert.deepEqual(accepts.map(a => a.chosen_time), [times[0]]);
      assert.deepEqual(errors, []);
      await c.close();
      console.log(`PASS proposal confirm at ${width}px`);
    }
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
