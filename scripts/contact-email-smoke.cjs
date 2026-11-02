// All identity, contact-email, and booking services are intercepted. No email is sent.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.VANTA_PLAYWRIGHT_PATH || 'playwright');
const website = process.env.VANTA_TEST_URL || 'http://127.0.0.1:3052';
const studio = process.env.STUDIO_TEST_URL || 'http://127.0.0.1:3051';
const output = process.env.VANTA_TEST_OUTPUT || '../artifacts/contact-email-2026-10-22';
const artist = '11111111-1111-4111-8111-111111111111';
const uid = '22222222-2222-4222-8222-222222222222';
const errors = [], unexpected = [], results = [];

async function open(browser, base, path, width = 390, email = 'client@privaterelay.appleid.com', initial = {}) {
  const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: width < 1000, hasTouch: width < 1000 });
  const identity = { id: uid, email, role: 'authenticated', aud: 'authenticated', user_metadata: { full_name: 'Local Client', dob: '1990-01-01', phone: '+61412345678', marketing_email: true, marketing_sms: true } };
  const session = { access_token: 'local-test-token', refresh_token: 'local-refresh-token', expires_at: 4102444800, expires_in: 3600, token_type: 'bearer', user: identity };
  const calls = { preferences: 0, codes: 0, skips: 0, verification: 0, consent: [] };
  let state = { prompt_required: true, apple_private_email: true, contact_email: null, pending_email: null, ...initial };
  await context.addInitScript(value => localStorage.setItem('sb-aznxvdnpvbcofaqxgmtu-auth-token', JSON.stringify(value)), session);
  await context.route('**/*', route => {
    const req = route.request(), url = new URL(req.url());
    if (url.origin === new URL(base).origin && req.method() === 'GET') return route.continue();
    const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' };
    const reply = (json, status = 200) => route.fulfill({ json, status, headers });
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    if (url.pathname === '/auth/users/me/contact-email') {
      calls.preferences++;
      if (req.method() === 'POST') { calls.codes++; state.pending_email = req.postDataJSON().email.toLowerCase(); }
      return reply(state);
    }
    if (url.pathname === '/auth/users/me/contact-email/skip') {
      calls.skips++; state = { ...state, prompt_required: false, pending_email: null }; return reply(state);
    }
    if (url.pathname === '/auth/users/me/contact-email/verify') {
      calls.verification++;
      assert.deepEqual(Object.keys(req.postDataJSON()), ['code']);
      if (req.postDataJSON().code !== '123456') return reply({ error: 'That code is incorrect or expired.' }, 400);
      state = { ...state, contact_email: state.pending_email, pending_email: null, prompt_required: false }; return reply(state);
    }
    if (url.pathname === '/auth/users/me') return reply({ id: uid, name: 'Local Client', phone: '+61412345678', email, termsAcceptedVersion: '1.0' });
    if (url.pathname === '/auth/v1/user') return reply(req.method() === 'PUT' ? { user: identity } : identity);
    if (url.pathname.endsWith('/public')) return reply({ name: 'Vanta Studio', artists: [] });
    if (url.pathname.endsWith('/consent-templates')) return reply({ templates: [{ id: 'local-form', name: 'Studio consent', fields: [], requires_signature: false }] });
    if (url.pathname.endsWith('/consent') && req.method() === 'POST') { calls.consent.push(req.postDataJSON()); return reply({ ok: true }); }
    if (url.pathname === `/artists/${artist}`) return reply({ id: artist, name: 'Local Artist', studios: [] });
    if (url.pathname.endsWith('/referral-code')) return reply({});
    if (url.pathname.endsWith('/work-schedule')) return reply({ schedule: [] });
    if (url.pathname === '/booking/studio-token') return reply({ studio: { id: 'local', name: 'Vanta Studio', timezone: 'UTC' }, booking: { id: 'local-booking', artist_id: artist, status: 'pending', duration_minutes: 60 }, artists: [{ id: artist, name: 'Local Artist' }] });
    if (url.pathname === '/booking/studio-token/slots') return reply({ timezone: 'UTC', mode: 'all', days: [] });
    unexpected.push({ method: req.method(), path: url.pathname });
    return reply({ error: 'External request blocked by test' }, 400);
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base + path, { waitUntil: 'networkidle' });
  return { page, context, calls, state: () => state };
}

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.VANTA_CHROMIUM_PATH });
  try {
    for (const [site, base, path] of [['website', website, '/signup'], ['booking', website, `/bookings?artist=${artist}`], ['booking-link', website, '/booking/_?token=studio-token'], ['studio', studio, '/consent?s=local']]) {
      for (const width of [320, 390, 1280]) {
        const { page, context, calls, state } = await open(browser, base, path, width);
        const dialog = page.getByRole('dialog', { name: 'Where should we email you?' });
        await dialog.waitFor();
        const bounds = await dialog.boundingBox();
        assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width + 1);
        assert.ok(bounds.y >= 0 && bounds.y + bounds.height <= 845);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        await page.screenshot({ path: `${output}/${site}-choice-${width}.png` });
        await dialog.getByRole('button', { name: 'Keep Apple private email', exact: true }).click();
        await page.waitForFunction(() => !document.querySelector('dialog[open]'));
        assert.equal(calls.codes, 0, 'Keeping Apple email must not require another address');
        assert.equal(state().contact_email, null);
        assert.equal(calls.skips, 1);
        await page.reload({ waitUntil: 'networkidle' });
        assert.equal(await page.locator('dialog[open]').count(), 0, 'A saved choice must survive reload');
        results.push(`${site} optional relay choice: ${width}px`);
        await context.close();
      }
    }

    {
      const { page, context, calls, state } = await open(browser, website, '/signup', 390, 'client@private.icloud.com');
      await page.getByLabel('Contact email (optional)', { exact: true }).fill('Real@Example.test');
      await page.getByRole('button', { name: 'Send verification code', exact: true }).click();
      await page.getByRole('dialog', { name: 'Verify your contact email' }).waitFor();
      assert.equal(state().contact_email, null, 'An unverified address is not a saved delivery address');
      await page.getByLabel('Verification code', { exact: true }).fill('000000');
      await page.getByRole('button', { name: 'Verify and save email', exact: true }).click();
      await page.getByRole('alert').filter({ hasText: 'incorrect or expired' }).waitFor();
      assert.equal(state().contact_email, null);
      await page.getByLabel('Verification code', { exact: true }).fill('123456');
      await page.getByRole('button', { name: 'Verify and save email', exact: true }).click();
      await page.waitForFunction(() => !document.querySelector('dialog[open]'));
      assert.equal(state().contact_email, 'real@example.test');
      assert.equal(calls.verification, 2);
      const identity = await page.evaluate(() => JSON.parse(localStorage.getItem('sb-aznxvdnpvbcofaqxgmtu-auth-token')).user.email);
      assert.equal(identity, 'client@private.icloud.com', 'Contact verification must not change Apple identity');
      results.push('New Apple relay domain, verification rejection/success, unchanged Apple identity');
      await context.close();
    }

    {
      const { page, context, calls } = await open(browser, website, '/signup', 390, 'shared@example.test');
      await page.getByRole('heading', { name: 'You’re signed in', exact: true }).waitFor();
      assert.equal(calls.preferences, 0, 'Email/Google/shared-email signup already has its chosen address');
      assert.equal(await page.locator('dialog[open]').count(), 0);
      results.push('Normal email signup does not request extra contact information');
      await context.close();
    }

    {
      const { page, context } = await open(browser, website, `/bookings?artist=${artist}`, 390);
      // Complete the optional choice while the booking page remains mounted.
      await page.getByLabel('Contact email (optional)', { exact: true }).fill('booking-contact@example.test');
      await page.getByRole('button', { name: 'Send verification code', exact: true }).click();
      await page.getByLabel('Verification code', { exact: true }).fill('123456');
      await page.getByRole('button', { name: 'Verify and save email', exact: true }).click();
      await page.waitForFunction(() => !document.querySelector('dialog[open]'));
      await page.getByRole('button', { name: /^Piercing / }).click();
      await page.getByRole('button', { name: 'Continue', exact: true }).click();
      await page.getByPlaceholder('e.g. Left nostril, one piercing, jewellery preference…').fill('Nostril piercing');
      await page.getByRole('button', { name: 'Select placement…' }).click();
      await page.getByRole('button', { name: 'Nostril', exact: true }).click();
      await page.getByRole('button', { name: 'Done', exact: true }).click();
      await page.getByRole('button', { name: 'Continue', exact: true }).click();
      await page.getByRole('button', { name: 'Toggle push to later', exact: true }).click();
      await page.locator('input[type=date]').fill('2099-01-01');
      await page.getByRole('button', { name: 'Continue', exact: true }).click();
      assert.equal(await page.getByPlaceholder('jane@example.com', { exact: true }).inputValue(), 'booking-contact@example.test');
      results.push('Booking contact field updates after verification while the form stays open');
      await context.close();
    }

    for (const optIn of [false, true]) {
      const { page, context, calls } = await open(browser, studio, '/consent?s=local', 390, 'client@privaterelay.appleid.com', { prompt_required: false, contact_email: 'verified@example.test' });
      const emailChoice = page.getByRole('checkbox', { name: 'Send me offers and updates from Vanta Studio by email.', exact: true });
      const smsChoice = page.getByRole('checkbox', { name: 'Send me offers and updates from Vanta Studio by text.', exact: true });
      await emailChoice.waitFor();
      assert.equal(await emailChoice.isChecked(), false, 'Old signup metadata cannot opt in a new contact address');
      assert.equal(await smsChoice.isChecked(), false);
      if (optIn) await emailChoice.check();
      await page.getByRole('checkbox', { name: /I have read and agreed to the above/ }).check();
      await page.getByRole('button', { name: 'Submit consent', exact: true }).click();
      await page.getByRole('heading', { name: 'Consent recorded', exact: true }).waitFor();
      assert.equal(calls.consent.length, 1);
      assert.equal(calls.consent[0].marketing_email, optIn);
      assert.equal(calls.consent[0].marketing_sms, false);
      results.push(`Studio marketing requires a separate email choice: ${optIn}`);
      await context.close();
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(unexpected, []);
    fs.writeFileSync(`${output}/web-results.json`, JSON.stringify({ results, errors, unexpected }, null, 2));
    console.log(results.join('\n'));
    console.log('Contact email browser checks passed. All external services were mocked.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
