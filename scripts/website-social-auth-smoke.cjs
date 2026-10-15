// Local static site only; every identity/account endpoint is mocked.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.VANTA_PLAYWRIGHT_PATH || 'playwright');
const base = process.env.VANTA_BOOKING_TEST_URL || 'http://127.0.0.1:3020';
const backend = 'https://inkspire-backend-xa2a.onrender.com';
const authHost = 'aznxvdnpvbcofaqxgmtu.supabase.co';
const artistId = '11111111-1111-4111-8111-111111111111';
const auth = { access_token: 'test-access-token', refresh_token: 'test-refresh-token', expires_at: 4102444800, expires_in: 3600, token_type: 'bearer', user: { id: '22222222-2222-4222-8222-222222222222', email: 'client@example.test', role: 'authenticated', aud: 'authenticated', user_metadata: { full_name: 'Test client' } } };

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.VANTA_CHROMIUM_PATH });
  try {
    for (const scenario of ['signup-google', 'booking-google', 'studio-google', 'confirm-apple', 'provider-unavailable', 'cancelled', 'profile-failure']) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await context.newPage();
      let created = false, creations = 0, exchanges = 0, starts = 0;
      await context.route('**/*', async route => {
        const request = route.request(); const url = new URL(request.url());
        if (url.origin === new URL(base).origin) return route.continue();
        if (url.hostname === authHost) {
          if (url.pathname.endsWith('/authorize')) {
            starts++;
            assert.equal(url.searchParams.get('provider'), scenario.includes('apple') ? 'apple' : 'google');
            assert.equal(url.searchParams.get('redirect_to'), base + '/auth/callback');
            assert.equal(url.searchParams.get('code_challenge_method').toLowerCase(), 's256');
            assert(url.searchParams.get('code_challenge').length >= 40);
            if (scenario === 'provider-unavailable') return route.fulfill({ status: 400, json: { msg: 'Unsupported provider: missing OAuth secret' } });
            return route.fulfill({ status: 302, headers: { location: base + '/auth/callback?code=fixture-code' } });
          }
          if (url.pathname.endsWith('/token')) {
            exchanges++;
            const body = request.postDataJSON();
            assert.equal(body.auth_code, 'fixture-code');
            assert(body.code_verifier.length >= 40);
            return route.fulfill({ json: auth });
          }
          return route.fulfill({ json: { user: auth.user } });
        }
        if (url.origin === backend) {
          if (url.pathname === '/users/me') {
            if (scenario === 'profile-failure') return route.fulfill({ status: 500, json: { error: 'Temporary failure' } });
            return route.fulfill({ status: created ? 200 : 404, json: created ? { id: auth.user.id, name: 'Test client', termsAcceptedVersion: '1.0' } : { error: 'User not found' } });
          }
          if (url.pathname === '/auth/users/me') {
            creations++; created = true;
            assert.equal(request.postDataJSON().termsAcceptedVersion, '1.0');
            return route.fulfill({ status: 201, json: { id: auth.user.id, name: 'Test client', termsAcceptedVersion: '1.0' } });
          }
          if (url.pathname === `/artists/${artistId}`) return route.fulfill({ json: { id: artistId, name: 'Test artist', studios: [] } });
          if (url.pathname.endsWith('/referral-code')) return route.fulfill({ json: {} });
          if (url.pathname.endsWith('/work-schedule')) return route.fulfill({ json: { schedule: [] } });
          if (url.pathname === '/booking/studio-token') return route.fulfill({ json: { studio: { id: 'studio-test', name: 'Test studio', timezone: 'UTC' }, booking: { id: 'booking-test', status: 'pending', artist_id: artistId, duration_minutes: 60 }, artists: [{ id: artistId, name: 'Test artist' }] } });
          if (url.pathname === '/booking/studio-token/slots') return route.fulfill({ json: { timezone: 'UTC', mode: 'all', days: [] } });
          if (url.pathname.startsWith('/bookings/')) return route.fulfill({ json: { id: 'booking-test', status: 'pending', proposed_time_primary: '2099-01-01T03:00:00Z', session_type: 'small', deposit_required: false } });
          return route.fulfill({ json: {} });
        }
        return route.abort();
      });

      if (scenario === 'cancelled') {
        await page.goto(base + '/auth/callback?error=access_denied');
        await page.getByText('Sign-in was not completed. Please return and try again.').waitFor();
        assert.equal(creations, 0);
      } else {
        const path = scenario === 'booking-google' ? `/bookings?artist=${artistId}` : scenario === 'studio-google' ? '/booking/_?token=studio-token' : scenario === 'confirm-apple' ? '/bookings/_/confirm?id=booking-test' : '/signup';
        await page.goto(base + path);
        const provider = scenario === 'confirm-apple' ? 'Apple' : 'Google';
        const button = page.getByRole('button', { name: `Continue with ${provider}`, exact: true });
        await button.waitFor();
        if (scenario === 'studio-google') await page.getByRole('button', { name: 'Create account', exact: true }).first().click();
        if (scenario !== 'confirm-apple') {
          await button.click();
          await page.getByText('Please agree to the Terms of Use and Privacy Policy above.').waitFor();
          assert.equal(starts, 0, 'Terms gating must happen before the OAuth request');
          await page.getByRole('checkbox').check();
        }
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'Auth page overflow');
        if (scenario === 'signup-google') { await page.locator('main').evaluate(node => { node.scrollTop = 0; }); await page.screenshot({ path: '/private/tmp/vanta-website-signup-mobile.png', fullPage: true }); }
        await button.click();
        if (scenario === 'provider-unavailable') {
          await page.getByText('Google sign-in is temporarily unavailable. Please use email or try again later.').waitFor();
          await page.getByRole('button', { name: 'Create account with email', exact: true }).waitFor();
          assert.equal(exchanges, 0);
        } else if (scenario === 'profile-failure') {
          await page.getByText('Unable to load your Vanta account. Please try again.').waitFor();
          assert.equal(creations, 0, 'A profile lookup failure must not create a new account');
        } else {
          if (scenario === 'confirm-apple') {
            await page.getByRole('heading', { name: 'Finish creating your account' }).waitFor();
            assert.equal(creations, 0);
            await page.getByRole('checkbox').check();
            await page.getByRole('button', { name: 'Create account', exact: true }).click();
          }
          if (scenario === 'signup-google') await page.getByRole('heading', { name: 'You’re signed in' }).waitFor();
          if (scenario === 'booking-google') await page.getByText('Session Type', { exact: true }).waitFor();
          if (scenario === 'studio-google') await page.getByRole('heading', { name: 'Choose a date', exact: true }).waitFor();
          if (scenario === 'confirm-apple') await page.getByRole('heading', { name: 'Choose your time' }).waitFor();
          assert.equal(new URL(page.url()).pathname, new URL(base + path).pathname);
          assert.equal(new URL(page.url()).search, new URL(base + path).search);
          assert.equal(exchanges, 1);
          assert.equal(creations, 1);
        }
      }
      console.log('PASS:', scenario);
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
