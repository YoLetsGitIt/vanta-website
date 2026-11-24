// The studio page: gallery style, the room hero, features, price and the trial links.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.STUDIO_PLAYWRIGHT_PATH || 'playwright');
const base = process.env.PUBLIC_TEST_URL || 'http://localhost:4174';
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

(async () => {
  const browser = await chromium.launch({ executablePath: executablePath || undefined });
  try {
    for (const width of [1440, 768, 390, 320]) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, hasTouch: width < 500, isMobile: width < 500 });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.addInitScript(() => sessionStorage.setItem('vanta-intro-seen', 'true'));
      assert.equal((await page.goto(base + '/studio/')).status(), 200);
      await page.getByRole('heading', { level: 1, name: /Run the whole studio from one desk/ }).waitFor();
      assert.equal(await page.locator('main').evaluate(el => el.scrollWidth <= el.clientWidth + 1), true, `no sideways scroll at ${width}`);
      for (const name of ['Every booking, one inbox.', 'One record per client.', 'Deposits in. Artists paid.', 'Bring your artists in a minute.', 'One price for the whole studio.']) await page.getByRole('heading', { level: 2, name }).waitFor({ state: 'attached' });
      assert.match(await page.locator('#pricing').textContent(), /A\$50.*Up to 6 artists\. A\$8/s);
      const trial = page.getByRole('link', { name: 'Start your 14-day trial' }).first();
      assert.match(await trial.getAttribute('href'), /\/signup\/$/);
      const images = await page.locator('main img').evaluateAll(list => list.map(img => img.getAttribute('src')));
      for (const src of new Set(images)) assert.equal((await page.request.get(base + src)).status(), 200, src);
      assert.deepEqual(errors, []);
      console.log(`PASS ${width}: studio page, sections, price, trial links, images`);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
