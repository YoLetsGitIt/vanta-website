// Studio short links: vanta.tattoo/b|c|w/<slug> open the booking, consent and walk-in forms.
// Serve out/ with clean URLs first; the backend and studio app are mocked.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.VANTA_PLAYWRIGHT_PATH || 'playwright');
const base = process.env.VANTA_BOOKING_TEST_URL || 'http://127.0.0.1:3072';
const studioId = '11111111-1111-4111-8111-111111111111';

(async () => {
  const browser = await chromium.launch();
  try {
    for (const [prefix, page] of [['b', 'studio-booking'], ['c', 'consent'], ['w', 'walkin']]) {
      const context = await browser.newContext();
      let landed = '';
      await context.route('https://**', route => {
        const url = new URL(route.request().url());
        if (url.pathname === '/booking-links/demo-studio') return route.fulfill({ json: { studio_id: studioId } });
        if (url.hostname.startsWith('studio.')) { landed = url.pathname + url.search; return route.fulfill({ contentType: 'text/html', body: '<h1>Studio app</h1>' }); }
        return route.fulfill({ json: {} });
      });
      const tab = await context.newPage();
      await tab.goto(`${base}/${prefix}/demo-studio`);
      await tab.getByRole('heading', { name: 'Studio app' }).waitFor();
      assert.equal(landed, `/${page}?s=${studioId}`);
      assert.equal(await tab.getByText('#ink').count(), 0, 'No intro on short links');
      console.log(`PASS /${prefix}/<slug> opens ${page}`);
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
