// Run against a local static export; all remote APIs are mocked.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.VANTA_PLAYWRIGHT_PATH || 'playwright');
const base = process.env.VANTA_BOOKING_TEST_URL || 'http://127.0.0.1:3029';
const api = 'https://inkspire-backend-xa2a.onrender.com';
const artistId = 'a2126c9c-8910-44d6-a73e-7aed20de405e';
const auth = { access_token: 'test-token', refresh_token: 'test-refresh', expires_at: 4102444800, expires_in: 3600, token_type: 'bearer', user: { id: '22222222-2222-4222-8222-222222222222', email: 'client@example.test', role: 'authenticated', aud: 'authenticated' } };

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.VANTA_CHROMIUM_PATH });
  try {
    for (const width of [390, 1280]) {
      for (const reference of ['InkByAlex', artistId, 'missing']) {
        const context = await browser.newContext({ viewport: { width, height: 900 } });
        await context.addInitScript(session => localStorage.setItem('sb-aznxvdnpvbcofaqxgmtu-auth-token', JSON.stringify(session)), auth);
        await context.route('https://aznxvdnpvbcofaqxgmtu.supabase.co/**', route => route.fulfill({ json: auth }));
        let submitted = false;
        const paths = [];
        await context.route(`${api}/**`, route => {
          const path = new URL(route.request().url()).pathname;
          paths.push(path);
          if (path.startsWith('/artists/by-username/')) {
            return route.fulfill({ status: reference === 'missing' ? 404 : 200, json: { artist_id: artistId } });
          }
          if (path === `/artists/${artistId}`) return route.fulfill({ json: { id: artistId, name: 'Alex Ink' } });
          if (path.endsWith('/referral-code')) return route.fulfill({ json: { referral_code: 'ALEX' } });
          if (path.endsWith('/work-schedule')) return route.fulfill({ json: { schedule: [] } });
          if (path === '/users/me') return route.fulfill({ json: { name: 'Test Client', email: 'client@example.test', phone: '+61400000000' } });
          if (path === '/bookings' && route.request().method() === 'POST') {
            assert.equal(route.request().postDataJSON().artist_id, artistId);
            submitted = true;
            return route.fulfill({ status: 201, json: { id: 'test-booking' } });
          }
          return route.fulfill({ json: {} });
        });
        const page = await context.newPage();
        await page.goto(`${base}/bookings?artist=${reference}`);
        if (reference === 'missing') {
          await page.getByRole('heading', { name: 'Artist not found' }).waitFor();
          assert(!paths.some(path => path === `/artists/${artistId}`));
        } else {
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
          await page.getByPlaceholder('Jane Smith').fill('Test Client');
          await page.getByRole('button', { name: 'Continue', exact: true }).click();
          await page.getByRole('button', { name: 'Send Request', exact: true }).click();
          await page.getByText('Request sent', { exact: false }).first().waitFor();
          assert(submitted);
          assert(paths.includes(`/artists/${artistId}/referral-code`));
          assert(paths.includes(`/artists/${artistId}/work-schedule`));
          assert.equal(paths.filter(path => path.startsWith('/artists/by-username/')).length, reference === artistId ? 0 : 1);
        }
        await context.close();
      }
    }
    console.log('PASS: custom and legacy links submit the correct artist UUID on mobile and desktop; unknown usernames remain unavailable for signed-in clients.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
