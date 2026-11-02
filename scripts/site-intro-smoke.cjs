const assert = require('node:assert/strict');
const { chromium } = require(process.env.STUDIO_PLAYWRIGHT_PATH || 'playwright');

const base = process.env.PUBLIC_TEST_URL || 'http://127.0.0.1:3054';
const intro = '.typewriter-overlay';
const content = 'body > div[style*="contents"]';

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
  });
  try {
    for (const path of ['/', '/artists', '/studio', '/pricing', '/signup', '/bookings', '/consent', '/privacy', '/terms', '/artist/account']) {
      const context = await browser.newContext({ viewport: { width: path === '/artists' ? 390 : 1280, height: 900 } });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      // Record short-lived words before navigation finishes loading page assets.
      await page.addInitScript(() => {
        window.introWordsSeen = [];
        new MutationObserver(() => {
          const text = document.querySelector('.typewriter-text')?.textContent;
          if (text && window.introWordsSeen.at(-1) !== text) window.introWordsSeen.push(text);
        }).observe(document, { subtree: true, childList: true, characterData: true });
      });
      await page.goto(base + path, { waitUntil: 'domcontentloaded' });
      await page.locator(intro).waitFor();
      assert.equal(await page.locator(content).getAttribute('inert'), '', `${path}: content is inactive during the intro`);
      for (const word of ['#ink', '#tattoo', '#inspo']) {
        await page.waitForFunction(word => window.introWordsSeen.includes(`${word}|`), word);
      }
      await page.locator(intro).waitFor({ state: 'detached' });
      assert.equal(await page.locator(content).getAttribute('inert'), null, `${path}: content is usable after the fade`);
      assert.equal(await page.evaluate(() => sessionStorage.getItem('vanta-intro-seen')), 'true');
      await page.reload();
      await page.waitForTimeout(600);
      assert.equal(await page.locator(intro).count(), 0, `${path}: no replay on reload`);
      if (path === '/') {
        await page.getByRole('link', { name: 'For artists', exact: true }).first().click();
        await page.waitForURL('**/artists');
        assert.equal(await page.locator(intro).count(), 0, 'No replay on client navigation');
      }
      assert.deepEqual(errors, [], `${path}: no browser errors`);
      await context.close();
      console.log(`PASS ${path}: complete sequence, fade, usable content and session persistence`);
    }

    const reduced = await browser.newContext({ reducedMotion: 'reduce' });
    const reducedPage = await reduced.newPage();
    await reducedPage.goto(base + '/artists');
    await reducedPage.waitForTimeout(600);
    assert.equal(await reducedPage.locator(intro).count(), 0);
    assert.equal(await reducedPage.locator(content).getAttribute('inert'), null);
    await reduced.close();
    console.log('PASS reduced motion: intro skipped');

    const studio = await browser.newContext();
    // Mirror the local website onto the excluded hostname; never call live Studio.
    await studio.route('http://studio.vanta.tattoo/**', async route => {
      const url = new URL(route.request().url());
      const response = await route.fetch({ url: base + url.pathname + url.search });
      await route.fulfill({ response });
    });
    const studioPage = await studio.newPage();
    await studioPage.goto('http://studio.vanta.tattoo/');
    await studioPage.locator('[data-motion="true"]').waitFor();
    assert.equal(await studioPage.locator(intro).count(), 0);
    assert.equal(await studioPage.locator(content).getAttribute('inert'), null);
    assert.equal(await studioPage.evaluate(() => sessionStorage.getItem('vanta-intro-seen')), null);
    await studio.close();
    console.log('PASS Studio hostname: intro excluded');

    const blocked = await browser.newContext();
    await blocked.addInitScript(() => {
      Storage.prototype.getItem = Storage.prototype.setItem = () => { throw new DOMException('Storage blocked', 'SecurityError'); };
    });
    const blockedPage = await blocked.newPage();
    await blockedPage.goto(base + '/');
    await blockedPage.locator(intro).waitFor();
    await blockedPage.locator(intro).waitFor({ state: 'detached' });
    assert.equal(await blockedPage.locator(content).getAttribute('inert'), null);
    await blocked.close();
    console.log('PASS blocked storage: intro completes and content unlocks');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
