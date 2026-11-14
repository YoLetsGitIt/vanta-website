// vanta.tattoo/artist/account: where artists land after Stripe or a mailbox from the app.
// No sign-in, no site intro, nothing loaded from the backend.
// VANTA_PLAYWRIGHT_PATH=/path/to/playwright VANTA_BOOKING_TEST_URL=http://127.0.0.1:3072 node scripts/artist-account-return-smoke.cjs
const assert = require('node:assert/strict');
const { chromium } = require(process.env.VANTA_PLAYWRIGHT_PATH || 'playwright');
const base = process.env.VANTA_BOOKING_TEST_URL || 'http://127.0.0.1:3072';
const shots = process.env.VANTA_SCREENSHOT_DIR;

(async () => {
  const browser = await chromium.launch();
  try {
    for (const [query, title] of [['?checkout=success', 'You’re subscribed to Vanta Pro'], ['?checkout=cancelled', 'No subscription was set up'], ['?portal=done', 'Your plan is up to date'], ['', 'Vanta Pro is in the app']]) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await context.newPage();
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      const calls = [];
      page.on('request', r => { const host = new URL(r.url()).hostname; if (host.includes('onrender.com') || host.includes('supabase.co')) calls.push(r.url()); });
      await page.goto(`${base}/artist/account${query}`, { waitUntil: 'networkidle' });
      await page.getByRole('heading', { name: title }).waitFor();
      assert.equal(await page.locator('.typewriter-text').count(), 0, 'No site intro');
      assert.equal(await page.locator('input[type=password], input[type=email]').count(), 0, 'No sign-in');
      assert.equal(await page.getByRole('link', { name: 'Open Vanta' }).getAttribute('href'), 'vanta://');
      assert.deepEqual(calls, [], 'Nothing loaded from the backend');
      assert.deepEqual(errors, []);
      if (shots) await page.screenshot({ path: `${shots}/artist-return${query.replace(/[?=]/g, '-') || '-plain'}.png`, fullPage: true });
      console.log(`PASS artist account return ${query || '(plain)'}`);
      await context.close();
    }
  } finally {
    await browser.close();
  }
})().catch(err => { console.error(err); process.exit(1); });
