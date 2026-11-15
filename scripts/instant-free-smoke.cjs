// Instant booking a free appointment (a $0 consultation): no deposit, no payment step,
// booked straight away. Serve out/ with clean URLs first. All backend calls are mocked.
// VANTA_PLAYWRIGHT_PATH=/path/to/playwright VANTA_BOOKING_TEST_URL=http://127.0.0.1:3072 node scripts/instant-free-smoke.cjs
const assert = require('node:assert/strict');
const { chromium } = require(process.env.VANTA_PLAYWRIGHT_PATH || 'playwright');
const base = process.env.VANTA_BOOKING_TEST_URL || 'http://127.0.0.1:3072';
const shots = process.env.VANTA_SCREENSHOT_DIR;
const api = 'https://inkspire-backend-xa2a.onrender.com';
const artistId = 'a2126c9c-8910-44d6-a73e-7aed20de405e';
const typeId = '11111111-2222-4333-8444-555555555555';
const info = { available: true, studio: null, studio_id: null, places: [], timezone: 'Australia/Sydney', hold_minutes: 30,
  types: [{ id: typeId, name: 'Consultation', duration_minutes: 30, deposit: 0, price: 0 }],
  booking_types: [{ id: typeId, name: 'Consultation', duration_minutes: 30, deposit: 0, price: 0 }] };

(async () => {
  const browser = await chromium.launch();
  try {
    for (const width of [390, 1280]) {
      const c = await browser.newContext({ viewport: { width, height: 900 } });
      await c.route('https://aznxvdnpvbcofaqxgmtu.supabase.co/**', route => route.fulfill({ status: 401, json: {} }));
      let booked;
      await c.route(`${api}/**`, route => {
        const req = route.request(), url = new URL(req.url()), path = url.pathname;
        if (path === `/artists/${artistId}`) return route.fulfill({ json: { id: artistId, name: 'Alex Ink', serviceType: 'tattoo' } });
        if (path === `/artists/${artistId}/instant-booking`) return route.fulfill({ json: info });
        if (path === `/artists/${artistId}/open-times`) {
          const from = url.searchParams.get('date');
          return route.fulfill({ json: { days: [{ date: from, slots: [`${from}T10:00:00+11:00`, `${from}T10:30:00+11:00`] }] } });
        }
        if (path.endsWith('/work-schedule')) return route.fulfill({ json: { schedule: [] } });
        if (path === `/artists/${artistId}/booking-form`) return route.fulfill({ json: { fields: Object.fromEntries(['design_details', 'body_location', 'size', 'skin_tone', 'color', 'image_paths', 'notes', 'allergies', 'availability_windows', 'address'].map(k => [k, { enabled: false, required: false }])) } });
        if (path === '/bookings/guest') {
          booked = req.postDataJSON();
          return route.fulfill({ status: 201, json: { id: 'b1', instant: { confirmed: true, client_token: 'tok', checkout_url: `${base}/bookings?artist=${artistId}&instant=paid&b=b1&t=tok` } } });
        }
        if (path === '/bookings/b1/instant-status') return route.fulfill({ json: { state: 'booked', free: true, chosen_time: '2026-11-18T10:00:00+11:00' } });
        return route.fulfill({ json: {} });
      });
      const page = await c.newPage();
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.goto(`${base}/bookings?artist=${artistId}`, { waitUntil: 'networkidle' });
      await page.getByText('Free', { exact: true }).first().waitFor();
      assert.equal(await page.getByText('deposit +', { exact: false }).count(), 0, 'No deposit shown for a free type');
      if (shots) await page.screenshot({ path: `${shots}/free-pick-${width}.png`, fullPage: true });
      const next = page.getByRole('button', { name: 'Continue', exact: true });
      await page.getByText('Consultation', { exact: true }).first().click();
      await next.click();
      await next.click(); // design questions are all off here
      await page.getByText('It’s free, so there’s nothing to pay', { exact: false }).waitFor();
      if (shots) await page.screenshot({ path: `${shots}/free-time-${width}.png`, fullPage: true });
      await page.getByText('10:00 am', { exact: true }).first().click();
      await next.click();
      await page.getByLabel('First name', { exact: true }).fill('Free');
      await page.getByLabel('Last name', { exact: true }).fill('Client');
      await page.getByRole('checkbox', { name: /Create a Vanta account/ }).uncheck();
      await page.getByLabel('Email', { exact: true }).fill('free@example.test');
      await page.getByLabel('Mobile number', { exact: true }).fill('0400 555 666');
      const g = page.getByRole('group', { name: 'Date of birth', exact: true }).first();
      await g.getByLabel('Day of birth').selectOption('8'); await g.getByLabel('Month of birth').selectOption('7'); await g.getByLabel('Year of birth').selectOption('1995');
      await next.click();
      await page.getByRole('heading', { name: 'Review and book' }).waitFor();
      await page.getByText('Free · nothing to pay').waitFor();
      assert.equal(await page.getByText('Vanta booking fee', { exact: false }).count(), 0, 'No booking fee for a free appointment');
      if (shots) await page.screenshot({ path: `${shots}/free-review-${width}.png`, fullPage: true });
      await page.getByRole('button', { name: 'Book', exact: true }).click();
      await page.getByRole('heading', { name: 'You’re booked in' }).waitFor();
      assert.equal(await page.getByText('deposit is paid', { exact: false }).count(), 0, 'No deposit mentioned');
      assert.equal(booked.instant.appointment_type_id, typeId);
      assert.deepEqual(errors, []);
      if (shots) await page.screenshot({ path: `${shots}/free-done-${width}.png`, fullPage: true });
      console.log(`PASS free instant booking at ${width}px`);
      await c.close();
    }
  } finally {
    await browser.close();
  }
})().catch(err => { console.error(err); process.exit(1); });
