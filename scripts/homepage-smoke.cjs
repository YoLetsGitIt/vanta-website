const assert = require('node:assert/strict');
const { chromium } = require(process.env.STUDIO_PLAYWRIGHT_PATH || 'playwright');
const base = process.env.PUBLIC_TEST_URL || 'http://localhost:4174';
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined });
  try {
    for (const width of [1440, 768, 390, 320]) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      const errors = [], missing = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('response', r => { if (r.url().startsWith(base) && r.status() >= 400) missing.push(r.url()); });
      await page.goto(base + '/');
      await page.waitForLoadState('networkidle');
      await page.getByRole('heading', { name: 'Find your next tattoo.' }).waitFor();
      const home = page.getByRole('main', { name: 'Vanta home' });
      assert(await home.evaluate(el => el.scrollWidth <= el.clientWidth), 'No horizontal overflow');
      assert.equal(await home.evaluate(el => getComputedStyle(el).scrollSnapType), 'none');
      const nav = page.getByRole('navigation', { name: 'Vanta products' });
      assert.equal(await nav.getByRole('link', { name: 'For artists' }).getAttribute('href'), '/artists');
      assert.equal(await nav.getByRole('link', { name: 'For studios' }).getAttribute('href'), '/studio');
      for (const link of await page.getByRole('link', { name: 'Download Vanta on the App Store', exact: true }).all()) {
        assert.match(await link.getAttribute('href'), /^https:\/\/apps.apple.com\//);
      }
      for (const link of await page.getByRole('link', { name: 'Join the Vanta Android beta on Google Play', exact: true }).all()) {
        assert.equal(await link.getAttribute('href'), 'https://play.google.com/apps/testing/vanta.tattoo');
      }
      const downloadBounds = await page.getByRole('link', { name: 'Download Vanta on the App Store', exact: true }).first().boundingBox();
      assert(downloadBounds.y >= 0 && downloadBounds.y + downloadBounds.height < 900, 'Downloads are visible in the opening viewport');
      await home.evaluate(el => el.scrollTo({ top: 0, behavior: 'instant' }));
      await page.screenshot({ path: `/tmp/vanta-home-redesign-${width}.png` });
      await page.locator('#the-experience').evaluate(el => el.scrollIntoView({ behavior: 'instant', block: 'start' }));
      const tabs = page.getByRole('tab');
      await tabs.nth(0).focus(); await page.keyboard.press('ArrowRight');
      assert.equal(await tabs.nth(1).getAttribute('aria-selected'), 'true');
      assert(await tabs.nth(1).evaluate(el => el === document.activeElement));
      await page.getByRole('heading', { name: 'A rough idea is a perfectly good start.' }).waitFor();
      await page.keyboard.press('End');
      assert.equal(await tabs.nth(2).getAttribute('aria-selected'), 'true');
      const panel = page.getByRole('tabpanel');
      await panel.locator('img').evaluate(img => img.decode());
      assert.match(await panel.locator('img').getAttribute('alt'), /appointment proposal/);
      await page.getByRole('button', { name: 'Back to Discover' }).click();
      await page.getByRole('heading', { name: 'The work catches your eye. The artist makes it yours.' }).waitFor();
      assert.equal(await tabs.nth(0).getAttribute('aria-selected'), 'true');
      await page.locator('#the-experience').evaluate(el => el.scrollIntoView({ behavior: 'instant', block: 'start' }));
      await page.waitForTimeout(700);
      await page.screenshot({ path: `/tmp/vanta-home-journey-${width}.png` });
      await page.locator('#get-vanta').evaluate(el => el.scrollIntoView({ behavior: 'instant', block: 'start' }));
      await page.waitForTimeout(700);
      await page.screenshot({ path: `/tmp/vanta-home-download-${width}.png` });
      await page.getByRole('link', { name: 'Contact', exact: true }).scrollIntoViewIfNeeded();
      assert(await page.getByRole('link', { name: 'Contact', exact: true }).isVisible());
      assert(await home.evaluate(el => el.scrollWidth <= el.clientWidth), 'No overflow at the end of the page');
      assert.deepEqual(errors, []); assert.deepEqual(missing, []);
      console.log(`PASS ${width}: responsive splash, visible downloads, keyboard chapters, store links, footer, no errors`);
      await page.close();
    }
    const android = await browser.newPage({ userAgent: 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/128.0 Mobile Safari/537.36' });
    await android.goto(base + '/');
    await android.waitForFunction(() => document.querySelector('[aria-label="Join the Vanta Android beta on Google Play"]')?.href === 'https://play.google.com/store/apps/details?id=vanta.tattoo');
    await android.close();
    console.log('PASS Android: beta download opens Google Play');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
