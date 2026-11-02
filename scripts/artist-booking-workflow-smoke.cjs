// Run against the local static export. Auth, email, storage and booking APIs are mocked.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.VANTA_PLAYWRIGHT_PATH || 'playwright');
const base = process.env.VANTA_BOOKING_TEST_URL || 'http://127.0.0.1:3019';
const api = 'https://inkspire-backend-xa2a.onrender.com';

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.VANTA_CHROMIUM_PATH });
  try {
    for (const width of [390, 1280]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const page = await context.newPage();
      let attempts = 0;
      await page.route(`${api}/**`, route => {
        const url = new URL(route.request().url());
        const payload = { booking_consent: true, studio_name: 'Test artist', email: 'client@example.test', signer_name: 'Test client', dob: null, expires_at: '2099-01-01T00:00:00Z', templates: [{ id: 'form-1', name: 'Appointment consent', requires_signature: true, fields: [{ id: 'policy', type: 'paragraph', label: 'The consent policy sent by your artist.' }, { id: 'agree', type: 'checkbox', label: 'I agree to this consent form', required: true }] }] };
        if (url.pathname.endsWith('/signature-upload-sign')) {
          return route.fulfill({ json: { uploads: [{ upload_url: 'https://storage.example.test/signature', storage_object_path: 'signatures/booking/request/signature.png' }] } });
        }
        if (route.request().method() === 'POST') {
          attempts++;
          const body = route.request().postDataJSON();
          assert.equal(body.signer_name, 'Test client');
          assert.equal(body.dob, '1990-01-01');
          assert.equal(body.submissions[0].answers.agree, 'true');
          assert.equal(body.submissions[0].client_signature_path, 'signatures/booking/request/signature.png');
          return attempts === 1 ? route.fulfill({ status: 422, json: { error: 'Please sign again.' } }) : route.fulfill({ json: { ok: true } });
        }
        assert.equal(url.pathname, '/public/booking-consent/bc_test');
        return route.fulfill({ json: payload });
      });
      await page.route('https://storage.example.test/**', route => route.fulfill({ status: 200, body: '' }));
      await page.goto(`${base}/consent?token=bc_test`);
      await page.getByLabel('Full name', { exact: true }).fill('Test client');
      await page.getByLabel('Date of birth').fill('1990-01-01');
      await page.getByRole('checkbox').check();
      await page.getByRole('button', { name: 'Type signature', exact: true }).click();
      await page.getByLabel('Full name for your electronic signature').fill('Test client');
      await page.getByRole('button', { name: 'Use typed signature', exact: true }).click();
      await page.getByText('Signature added.', { exact: true }).waitFor();
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `Consent form overflows at ${width}px`);
      await page.getByRole('button', { name: 'Submit consent', exact: true }).click();
      await page.getByText('Please sign again.', { exact: true }).waitFor();
      await page.getByRole('button', { name: 'Submit consent', exact: true }).click();
      await page.getByRole('heading', { name: 'Consent recorded' }).waitFor();
      assert.equal(attempts, 2);
      await context.close();
    }

    const context = await browser.newContext();
    const page = await context.newPage();
    await page.route(`${api}/public/booking-consent/**`, route => route.fulfill({ status: 410, json: { error: 'This consent link has expired.' } }));
    await page.goto(`${base}/consent?token=bc_expired`);
    await page.getByRole('heading', { name: 'Link unavailable' }).waitFor();
    await page.getByText('Ask your artist or studio for a new consent link.').waitFor();
    await context.close();

    const bookingContext = await browser.newContext({ viewport: { width: 390, height: 900 } });
    const auth = { access_token: 'test-access-token', refresh_token: 'test-refresh-token', expires_at: 4102444800, expires_in: 3600, token_type: 'bearer', user: { id: '22222222-2222-4222-8222-222222222222', email: 'client@example.test', role: 'authenticated', aud: 'authenticated' } };
    await bookingContext.addInitScript(session => localStorage.setItem('sb-aznxvdnpvbcofaqxgmtu-auth-token', JSON.stringify(session)), auth);
    await bookingContext.route('https://aznxvdnpvbcofaqxgmtu.supabase.co/**', route => route.fulfill({ json: auth }));
    const bookingPage = await bookingContext.newPage();
    let accepted = false;
    await bookingPage.route(`${api}/bookings/**`, route => {
      if (route.request().method() === 'POST') {
        assert.equal(route.request().postDataJSON().chosen_time, '2099-01-01T03:00:00Z');
        accepted = true;
        return route.fulfill({ json: { status: 'confirmed' } });
      }
      return route.fulfill({ json: { id: 'booking-test', status: accepted ? 'confirmed' : 'pending', proposed_time_primary: '2099-01-01T03:00:00Z', chosen_time: accepted ? '2099-01-01T03:00:00Z' : null, session_type: 'small', deposit_required: false } });
    });
    await bookingPage.goto(`${base}/bookings/_/confirm?id=booking-test`);
    await bookingPage.getByRole('heading', { name: 'Choose your time' }).waitFor();
    await bookingPage.locator('button[aria-pressed]').first().click();
    await bookingPage.getByRole('button', { name: 'Confirm booking', exact: true }).click();
    await bookingPage.getByRole('heading', { name: 'Booking confirmed' }).waitFor();
    assert(accepted);
    await bookingContext.close();
    console.log('PASS: mobile/desktop consent signing, failed-submit retry, expired links and client time acceptance. No live services called.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
