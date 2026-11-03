// Guest booking on vanta.tattoo: artist booking link and the emailed "choose your time" link.
// Serve out/ with clean URLs first. All backend and auth calls are mocked.
// VANTA_PLAYWRIGHT_PATH=/path/to/playwright VANTA_BOOKING_TEST_URL=http://127.0.0.1:3072 node scripts/guest-booking-smoke.cjs
const assert = require('node:assert/strict');
const { chromium } = require(process.env.VANTA_PLAYWRIGHT_PATH || 'playwright');
// Date of birth is three dropdowns (day, month, year).
const fillDob = async (page, iso) => { const [y, m, d] = iso.split('-'); const g = page.getByRole('group', { name: 'Date of birth', exact: true }).first(); await g.getByLabel('Day of birth').selectOption(String(+d)); await g.getByLabel('Month of birth').selectOption(String(+m)); await g.getByLabel('Year of birth').selectOption(y); };
const base = process.env.VANTA_BOOKING_TEST_URL || 'http://127.0.0.1:3072';
const shots = process.env.VANTA_SCREENSHOT_DIR;
const api = 'https://inkspire-backend-xa2a.onrender.com';
const artistId = 'a2126c9c-8910-44d6-a73e-7aed20de405e';

async function context(browser, width) {
  const c = await browser.newContext({ viewport: { width, height: 900 } });
  const calls = [];
  await c.route('https://aznxvdnpvbcofaqxgmtu.supabase.co/**', route => { calls.push({ method: route.request().method(), path: new URL(route.request().url()).pathname }); return route.fulfill({ status: 401, json: {} }); });
  return { c, calls };
}

(async () => {
  const browser = await chromium.launch();
  try {
    for (const width of [390, 1280]) {
      // Artist booking link: guest goes straight to the form and submits without auth.
      const { c, calls } = await context(browser, width);
      let booked, signed;
      await c.route(`${api}/**`, route => {
        const req = route.request(), path = new URL(req.url()).pathname;
        calls.push({ method: req.method(), path, auth: req.headers().authorization });
        if (path === `/artists/${artistId}`) return route.fulfill({ json: { id: artistId, name: 'Alex Ink' } });
        if (path.endsWith('/work-schedule')) return route.fulfill({ json: { schedule: [] } });
        if (path === '/bookings/guest') { booked = { body: req.postDataJSON(), auth: req.headers().authorization }; return route.fulfill({ status: 201, json: { id: 'b' } }); }
        if (path === '/bookings/guest/uploads/sign') { signed = req.postDataJSON(); return route.fulfill({ json: { uploads: [] } }); }
        return route.fulfill({ json: {} });
      });
      const page = await c.newPage();
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.goto(`${base}/bookings?artist=${artistId}`, { waitUntil: 'networkidle' });
      await page.getByRole('heading', { name: 'Book with Alex Ink' }).waitFor();
      const guestBox = await page.getByRole('button', { name: 'Continue as guest' }).boundingBox();
      const appleBox = await page.getByRole('button', { name: /Apple/ }).boundingBox();
      assert(guestBox.y < appleBox.y, 'Guest comes before Apple/Google');
      assert.equal(await page.getByPlaceholder('••••••••').count(), 0, 'Email sign-up is behind a link');
      await page.getByRole('button', { name: 'Log in with email', exact: true }).click();
      await page.getByRole('button', { name: 'Log in', exact: true }).last().waitFor();
      assert.equal(await page.getByPlaceholder('Your name').count(), 0, 'One tap opens log-in, not sign-up');
      await page.reload({ waitUntil: 'networkidle' });
      await page.getByRole('heading', { name: 'Book with Alex Ink' }).waitFor();
      if (shots) { await page.waitForTimeout(5000); await page.screenshot({ path: `${shots}/artist-gate-${width}.png`, fullPage: true }); }
      await page.getByRole('button', { name: 'Continue as guest' }).click();
      await page.getByRole('heading', { name: 'What appointment would you like?' }).waitFor();
      // Browser Back returns to the sign-in choice, and Forward resumes as a guest.
      await page.goBack();
      await page.getByRole('heading', { name: 'Book with Alex Ink' }).waitFor();
      await page.goForward();
      await page.getByRole('heading', { name: 'What appointment would you like?' }).waitFor();
      await page.getByRole('button', { name: /^Piercing/ }).click();
      await page.getByRole('button', { name: 'Continue', exact: true }).click();
      await page.locator('textarea').first().fill('Left nostril piercing');
      await page.getByRole('button', { name: 'Select placement…' }).click();
      await page.getByRole('button', { name: 'Nostril', exact: true }).click();
      await page.getByRole('button', { name: 'Done', exact: true }).click();
      await page.getByRole('button', { name: 'Continue', exact: true }).click();
      await page.getByRole('button', { name: 'Toggle push to later' }).click();
      await page.locator('input[type=date]').fill('2099-01-01');
      await page.getByRole('button', { name: 'Continue', exact: true }).click();
      await page.getByText('Booking as a guest.').waitFor();
      await page.getByPlaceholder('Jane Smith').fill('Guest Client');
      await page.getByPlaceholder('jane@example.com').fill('guest@example.test');
      const next = page.getByRole('button', { name: 'Continue', exact: true });
      assert(await next.isDisabled(), 'Phone and date of birth are required for guests');
      await page.getByPlaceholder('+1 555 0100').fill('+61400555666');
      assert(await next.isDisabled(), 'Date of birth is required for guests');
      await fillDob(page, '1995-07-08');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      if (shots) await page.screenshot({ path: `${shots}/artist-contact-${width}.png`, fullPage: true });
      await next.click();
      await page.getByRole('button', { name: 'Send Request', exact: true }).click();
      await page.getByText('Request sent', { exact: false }).first().waitFor();
      assert.equal(booked.auth, undefined);
      assert.deepEqual([booked.body.requester_name, booked.body.requester_email, booked.body.requester_phone, booked.body.dob], ['Guest Client', 'guest@example.test', '+61400555666', '1995-07-08']);
      assert(!calls.some(call => call.path === '/auth/users/me' || call.path === '/users' || call.path.startsWith('/auth/v1/signup')), 'No account is created');
      assert.deepEqual(errors, []);
      console.log(`PASS artist link guest booking at ${width}px`);
      await c.close();
    }

    // Emailed link for a guest booking: no sign-in screen; select works without auth.
    for (const width of [390, 1280]) {
      const { c } = await context(browser, width);
      let selected;
      const times = ['10:00', '11:00'];
      await c.route(`${api}/**`, route => {
        const req = route.request(), url = new URL(req.url());
        if (url.pathname === '/booking/tok') return route.fulfill({ json: { booking: { id: 'b', status: 'pending', artist_id: 'a1', duration_minutes: 60, deposit_required: false, guest_allowed: true }, studio: { name: 'Ink Studio', timezone: 'Australia/Melbourne', scheduling_mode: 'all' }, artists: [{ id: 'a1', name: 'Jo' }] } });
        if (url.pathname.endsWith('/slots')) return route.fulfill({ json: { mode: 'all', timezone: 'Australia/Melbourne', months: [], days: [{ date: '2026-09-10', slots: times, slot_details: times.map(t => ({ time: t, starts_at: `2026-09-10T${t}:00+10:00` })), recommended_slots: times }] } });
        if (url.pathname === '/booking/tok/select') { selected = { auth: req.headers().authorization, body: req.postDataJSON() }; return route.fulfill({ json: { status: 'requires_confirmation' } }); }
        return route.fulfill({ json: {} });
      });
      const page = await c.newPage();
      await page.clock.install({ time: new Date('2026-09-09T00:00:00Z') });
      await page.goto(`${base}/booking/_?token=tok`, { waitUntil: 'networkidle' });
      await page.getByRole('heading', { name: 'Choose a date', exact: true }).waitFor();
      await page.getByRole('button', { name: '10', exact: true }).click();
      await page.getByRole('button', { name: '10:00 am', exact: true }).click();
      await page.getByRole('button', { name: 'Continue', exact: true }).click();
      await page.getByRole('button', { name: 'Request appointment', exact: true }).click();
      await page.waitForFunction(() => true);
      await page.waitForTimeout(300);
      assert(selected, 'Selection submitted');
      assert.equal(selected.auth, undefined, 'Guests select without an account');
      console.log(`PASS guest selection link at ${width}px`);
      await c.close();
    }

    // Artist's proposed times: the email link's token confirms with no account or code.
    for (const width of [390, 1280]) {
      const { c, calls } = await context(browser, width);
      let accepted, resent = 0;
      await c.route(`${api}/**`, route => {
        const req = route.request(), url = new URL(req.url());
        calls.push({ method: req.method(), path: url.pathname, auth: req.headers().authorization });
        if (url.pathname === '/bookings/bk1/proposal' && url.searchParams.get('t') === 'tok1') return route.fulfill({ json: { id: 'bk1', status: accepted ? 'confirmed' : 'pending', proposed_time_primary: '2099-01-01T03:00:00Z', chosen_time: accepted ? '2099-01-01T03:00:00Z' : null, session_type: 'small', deposit_required: false } });
        if (url.pathname === '/bookings/bk1/proposal/accept' && url.searchParams.get('t') === 'tok1') { accepted = { auth: req.headers().authorization, body: req.postDataJSON() }; return route.fulfill({ json: { status: 'confirmed' } }); }
        if (url.pathname === '/bookings/bk1/proposal/resend') { resent++; return route.fulfill({ json: { ok: true } }); }
        return route.fulfill({ status: 404, json: {} });
      });
      const page = await c.newPage();
      await page.goto(`${base}/bookings/_/confirm?id=bk1&t=tok1`, { waitUntil: 'networkidle' });
      await page.getByRole('heading', { name: 'Choose your time' }).waitFor();
      await page.getByRole('button', { name: /2099/ }).click();
      await page.getByRole('button', { name: 'Confirm booking' }).click();
      await page.getByRole('heading', { name: 'Booking confirmed' }).waitFor();
      assert.equal(accepted.auth, undefined, 'Accepting by link needs no account');
      assert(!calls.some(call => /otp|signup|\/users$/.test(call.path)), 'No code or account');
      // Old email without a token: offer a new link, never a code.
      const old = await c.newPage();
      await old.goto(`${base}/bookings/_/confirm?id=bk1`, { waitUntil: 'networkidle' });
      await old.getByRole('heading', { name: 'Confirm your booking' }).waitFor();
      assert.equal(await old.locator('input[autocomplete="one-time-code"], input[type="email"]').count(), 0, 'No email code entry');
      await old.getByRole('button', { name: 'Email me a new link' }).click();
      await old.getByRole('status').waitFor();
      assert.equal(resent, 1);
      if (shots) { await old.waitForTimeout(5000); await old.screenshot({ path: `${shots}/confirm-old-link-${width}.png`, fullPage: true }); }
      console.log(`PASS proposal link confirms without account or code at ${width}px`);
      await c.close();
    }

    // Email sign-up on the artist link creates the account instantly; no "check your email".
    {
      const c = await browser.newContext({ viewport: { width: 390, height: 900 } });
      const session = { access_token: 'new-token', refresh_token: 'r', expires_at: 4102444800, expires_in: 3600, token_type: 'bearer', user: { id: '33333333-3333-4333-8333-333333333333', email: 'new@example.test', role: 'authenticated', aud: 'authenticated' } };
      const seen = [];
      await c.route('https://aznxvdnpvbcofaqxgmtu.supabase.co/**', route => {
        const path = new URL(route.request().url()).pathname; seen.push(path);
        if (path === '/auth/v1/token') return route.fulfill({ json: session });
        if (path === '/auth/v1/signup' || path === '/auth/v1/otp') throw new Error('Email confirmation sign-up must not be used');
        return route.fulfill({ json: session.user });
      });
      let created;
      await c.route(`${api}/**`, route => {
        const req = route.request(), path = new URL(req.url()).pathname;
        if (path === '/users' && req.method() === 'POST') { created = req.postDataJSON(); return route.fulfill({ status: 201, json: {} }); }
        if (path === `/artists/${artistId}`) return route.fulfill({ json: { id: artistId, name: 'Alex Ink' } });
        if (path.endsWith('/work-schedule')) return route.fulfill({ json: { schedule: [] } });
        return route.fulfill({ json: {} });
      });
      const page = await c.newPage();
      await page.goto(`${base}/bookings?artist=${artistId}`, { waitUntil: 'networkidle' });
      await page.getByRole('button', { name: 'Create account', exact: true }).click();
      await page.getByPlaceholder('Your name').fill('New Client');
      await page.getByPlaceholder('you@example.com').fill('new@example.test');
      await page.getByPlaceholder('••••••••').fill('example-password');
      await page.getByRole('checkbox').check();
      await page.getByRole('button', { name: 'Create account', exact: true }).last().click();
      await page.getByRole('heading', { name: 'What appointment would you like?' }).waitFor();
      assert.equal(created.email, 'new@example.test');
      assert.equal(await page.getByText('Check your email').count(), 0);
      console.log('PASS artist link email sign-up is instant');
      await c.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
