// Studio "choose a time" link with a deposit: picking a time saves nothing; the confirm
// step shows the studio's payment options, and only paying (or "I've paid") books it.
// No sign-in, even though the booking belongs to a Vanta account.
// Serve out/ first. All backend and auth calls are mocked.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.VANTA_PLAYWRIGHT_PATH || 'playwright');
const base = process.env.VANTA_BOOKING_TEST_URL || 'http://127.0.0.1:3072';
const api = 'https://inkspire-backend-xa2a.onrender.com';
const artist = { id: '11111111-1111-4111-8111-111111111111', name: 'Jamie Lee' };
const day = date => ({ date, slots: ['10:00', '11:00'], slot_details: ['10:00', '11:00'].map(time => ({ time, starts_at: `${date}T${time}:00+11:00` })), recommended_slots: ['10:00', '11:00'] });

(async () => {
  const browser = await chromium.launch();
  try {
    for (const width of [390, 1280]) {
      const c = await browser.newContext({ viewport: { width, height: 900 }, timezoneId: 'Australia/Melbourne' });
      await c.route('https://aznxvdnpvbcofaqxgmtu.supabase.co/**', route => route.fulfill({ status: 401, json: {} }));
      const selects = []; let confirmed = null;
      await c.route(`${api}/**`, route => {
        const req = route.request(), url = new URL(req.url());
        if (url.pathname === '/booking/sel') return route.fulfill({ json: {
          booking: confirmed
            ? { id: 'b', status: 'confirmed', chosen_time: confirmed, artist_id: artist.id, deposit_required: true, deposit_amount: 60, guest_allowed: true, deposit_claim: { method: 'payid', recorded_at: new Date().toISOString() }, deposit_options: { card: true, reference: 'VANTA-B', manual: { payid: 'pay@ink.example' } } }
            : { id: 'b', status: 'awaiting_payment', artist_id: artist.id, duration_minutes: 60, deposit_required: true, deposit_amount: 60, deposit_payable: false, guest_allowed: true, deposit_options: { card: true, reference: 'VANTA-B', manual: { payid: 'pay@ink.example' } } },
          studio: { name: 'Ink Studio', timezone: 'Australia/Melbourne', scheduling_mode: 'all' }, artists: [artist] } });
        if (url.pathname === '/booking/sel/slots') {
          const month = url.searchParams.get('date').slice(0, 7);
          return route.fulfill({ json: { mode: 'all', timezone: 'Australia/Melbourne', filtered_periods: false, months: [], offer: '', days: [day(`${month}-20`)] } });
        }
        if (url.pathname === '/booking/sel/select') {
          const body = req.postDataJSON(); selects.push(body);
          if (body.payment === 'payid') { confirmed = body.chosen_time; return route.fulfill({ json: { status: 'confirmed', method: 'payid' } }); }
          return route.fulfill({ status: 402, json: { code: 'payment_required' } });
        }
        return route.fulfill({ json: {} });
      });
      const page = await c.newPage();
      await page.clock.install({ time: new Date('2099-01-03T00:00:00Z') });
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.goto(`${base}/booking/_.html?token=sel`, { waitUntil: 'networkidle' });
      await page.getByRole('heading', { name: 'Choose a date' }).waitFor();
      assert.equal(await page.getByRole('heading', { name: /Sign in/ }).count(), 0, 'No sign-in');
      await page.getByRole('button', { name: '20', exact: true }).click();
      await page.getByRole('button', { name: '10:00 am', exact: true }).click();
      await page.getByRole('button', { name: 'Continue', exact: true }).click();
      await page.getByRole('heading', { name: 'Pay your deposit' }).waitFor();
      assert.equal(selects.length, 0, 'Picking a time sends nothing');
      await page.getByRole('button', { name: 'Pay $60.00 by card' }).waitFor();
      await page.getByText('pay@ink.example').waitFor();
      await page.getByRole('button', { name: 'I’ve paid by PayID' }).click();
      await page.getByRole('heading', { name: 'Booking confirmed' }).waitFor();
      await page.getByText(/you told the studio you paid the \$60\.00 deposit by PayID/).waitFor();
      assert.equal(selects.length, 1);
      assert.equal(selects[0].payment, 'payid');
      assert.deepEqual(errors, []);
      console.log(`PASS choose-a-time link: pick, then pay, at ${width}px`);
      await c.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
