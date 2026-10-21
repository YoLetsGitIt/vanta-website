// Local export only; auth, account lookups and booking writes are mocked.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.VANTA_PLAYWRIGHT_PATH || 'playwright');
const base = process.env.VANTA_BOOKING_TEST_URL || 'http://127.0.0.1:3058';
const api = 'https://inkspire-backend-xa2a.onrender.com';
const artistId = '11111111-1111-4111-8111-111111111111';
const northId = '33333333-3333-4333-8333-333333333333';
const southId = '44444444-4444-4444-8444-444444444444';
const north = { id: northId, name: 'North Ink', addressString: '1 North Street', timezone: 'Australia/Sydney' };
const south = { id: southId, name: 'South Ink', addressString: '2 South Street', timezone: 'Australia/Melbourne' };
const northHours = { day_of_week: 1, start_time: '09:00:00', end_time: '17:00:00', studio_id: northId };
const southHours = { day_of_week: 4, start_time: '12:15:00', end_time: '19:45:00', studio_id: southId };
const auth = { access_token: 'fixture-token', refresh_token: 'fixture-refresh', expires_at: 4102444800, expires_in: 3600, token_type: 'bearer', user: { id: '22222222-2222-4222-8222-222222222222', email: 'client@example.test', role: 'authenticated', aud: 'authenticated' } };
(async () => {
 const browser = await chromium.launch({ headless: true, executablePath: process.env.VANTA_CHROMIUM_PATH });
 try {
  for (const width of [390, 1280]) for (const scenario of ['multi-north', 'multi-south', 'single-legacy', 'empty-schedule', 'profile-hours']) {
   const context = await browser.newContext({ viewport: { width, height: 900 } });
   const page = await context.newPage();
   let submitted;
   const studios = scenario === 'single-legacy' ? [north] : scenario === 'profile-hours' ? [{ ...north, workingDays: [northHours] }, south] : [north, south];
   const schedule = scenario === 'single-legacy' ? [{ ...northHours, studio_id: null }] : scenario === 'empty-schedule' ? [northHours] : [northHours, southHours, { day_of_week: 5, start_time: '09:00', end_time: '17:00' }];
   await context.addInitScript(session => localStorage.setItem('sb-aznxvdnpvbcofaqxgmtu-auth-token', JSON.stringify(session)), auth);
   await context.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin === new URL(base).origin) return route.continue();
    if (url.hostname === 'aznxvdnpvbcofaqxgmtu.supabase.co') return route.fulfill({ json: { user: auth.user } });
    if (url.origin !== api) return route.abort();
    if (url.pathname === `/artists/${artistId}`) return route.fulfill({ json: { id: artistId, name: 'Alex Ink', studios } });
    if (url.pathname.endsWith('/referral-code')) return route.fulfill({ json: {} });
    if (url.pathname.endsWith('/work-schedule')) return route.fulfill({ status: scenario === 'profile-hours' ? 503 : 200, json: { schedule } });
    if (url.pathname === '/auth/users/me') return route.fulfill({ json: { id: auth.user.id, name: 'Test Client', phone: '+61400000000' } });
    if (url.pathname === '/bookings' && request.method() === 'POST') { submitted = request.postDataJSON(); return route.fulfill({ status: 201, json: { id: 'fixture-booking' } }); }
    throw new Error(`Unexpected API ${request.method()} ${url.pathname}`);
   });
   await page.goto(`${base}/bookings?artist=${artistId}`);
   await page.getByRole('button', { name: /^Piercing/ }).click();
   const next = () => page.getByRole('button', { name: 'Continue', exact: true });
   await next().click();
   await page.locator('textarea').first().fill('Left nostril piercing');
   await page.getByRole('button', { name: 'Select placement…' }).click();
   await page.getByRole('button', { name: 'Nostril', exact: true }).click();
   await page.getByRole('button', { name: 'Done', exact: true }).click();
   await next().click();
   const monday = page.getByRole('button', { name: 'Monday availability', exact: true });
   const thursday = page.getByRole('button', { name: 'Thursday availability', exact: true });
   if (scenario === 'single-legacy') {
    assert(await page.getByRole('radio', { name: /North Ink/ }).isChecked());
   } else {
    assert.equal(await monday.count(), 0, 'No unrestricted grid before a studio is chosen');
    assert(await next().isDisabled());
    await page.getByRole('radio', { name: /North Ink/ }).check();
   }
   assert.equal(await monday.getAttribute('aria-disabled'), 'false');
   assert.equal(await thursday.getAttribute('aria-disabled'), 'true');
   if (scenario.startsWith('multi-')) {
    await monday.press('Enter');
    assert(await next().isEnabled());
    await page.getByRole('radio', { name: /South Ink/ }).check();
    assert(await next().isDisabled(), 'Switching studios must clear existing time selections');
    assert.equal(await monday.getAttribute('aria-disabled'), 'true');
    assert.equal(await thursday.getAttribute('aria-disabled'), 'false');
    assert.equal(await page.getByRole('button', { name: 'Friday availability', exact: true }).getAttribute('aria-disabled'), 'true');
    if (scenario === 'multi-north') {
     await thursday.press('Enter');
     await page.getByRole('radio', { name: /North Ink/ }).check();
     assert(await next().isDisabled());
    }
   }
   const choosingSouth = ['multi-south', 'empty-schedule'].includes(scenario);
   if (scenario === 'empty-schedule') {
    await page.getByRole('radio', { name: /South Ink/ }).check();
    await page.getByRole('status').filter({ hasText: 'Weekly hours haven’t been set' }).waitFor();
    assert.equal(await monday.count(), 0, 'Empty studio hours must never open the whole week');
    assert(await next().isDisabled());
    await page.getByRole('button', { name: 'Toggle push to later' }).click();
    await page.locator('input[type=date]').fill('2099-01-01');
   } else if (scenario === 'multi-south') {
    const box = await thursday.boundingBox();
    const x = box.x + box.width / 2;
    // The first visible row starts at noon; this studio opens at 12:15.
    await page.mouse.move(x, box.y + 3); await page.mouse.down();
    await page.mouse.move(x, box.y + 60); await page.mouse.up();
    assert(await next().isDisabled(), 'Starting outside studio hours must not create a window');
    await page.mouse.move(x, box.y + 47); await page.mouse.down();
    await page.mouse.move(x, box.y + 85); await page.mouse.up();
    assert(await next().isEnabled());
   } else await monday.press('Enter');
   assert((await page.getByRole('radio', { name: /North Ink/ }).boundingBox()).width <= 22, 'Studio radios must stay compact despite global input styles');
   assert(await page.locator('.booking-page').evaluate(node => node.scrollWidth <= node.clientWidth), 'No horizontal page overflow');
   if (process.env.VANTA_BOOKING_ARTIFACTS && scenario === 'multi-south') {
    await page.locator('.booking-page').evaluate(node => { node.scrollTop = 0; });
    await page.screenshot({ path: `${process.env.VANTA_BOOKING_ARTIFACTS}/availability-${width}.png`, fullPage: true });
   }
   await next().click();
   await page.getByPlaceholder('Jane Smith').fill('Test Client');
   await next().click();
   const chosen = choosingSouth ? south : north;
   await page.getByText(chosen.name, { exact: true }).waitFor();
   await page.getByRole('button', { name: 'Send Request', exact: true }).click();
   await page.getByText('Request sent', { exact: false }).first().waitFor();
   assert.equal(submitted.studio_id, chosen.id);
   assert.equal(submitted.artist_id, artistId);
   assert.equal(submitted.source, 'personal');
   assert.deepEqual(submitted.availability_windows, scenario === 'empty-schedule' ? [] : [{ day_of_week: choosingSouth ? 4 : 1, start_time: choosingSouth ? '13:00' : '09:00', end_time: choosingSouth ? '14:00' : '17:00' }]);
   await context.close(); console.log(`PASS ${width} ${scenario}`);
  }
 } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
