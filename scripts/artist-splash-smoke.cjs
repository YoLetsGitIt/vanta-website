// Artist splash review: static local preview, existing images, mocked delayed media.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.STUDIO_PLAYWRIGHT_PATH || 'playwright');
const base = process.env.PUBLIC_TEST_URL || 'http://127.0.0.1:3048';
const output = process.env.ARTIST_REVIEW_OUTPUT || '/private/tmp/vanta-artist-splash-review';
(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH });
  try {
    for (const [width, height] of [[1920,1080],[1440,900],[1280,800],[768,1024],[390,844],[320,740]]) {
      const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
      const errors = [], missing = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('response', response => { if (response.url().startsWith(base) && response.status() >= 400) missing.push(response.url()); });
      await page.goto(base + '/artists/');
      const watch = page.getByRole('button', { name: 'Watch the app tour', exact: true });
      await watch.waitFor();
      await page.evaluate(() => document.fonts.ready);
      await page.locator('#artist-tour img').evaluateAll(images => Promise.all(images.map(image => image.decode().catch(() => {}))));
      const box = await watch.boundingBox(), videoBox = await page.getByRole('button', { name: 'Open the app tour', exact: true }).boundingBox();
      assert(box.height >= 44 && box.width >= 180, width + ' usable tour button');
      if (width > 760) assert(box.y + box.height < videoBox.y, width + ' tour action precedes video');
      else {
        assert(box.y >= videoBox.y + videoBox.height, width + ' tour action follows the screenshot fan');
        const actions = await page.locator('[class*="artists_heroActions"]').boundingBox();
        assert(videoBox.y < actions.y + actions.height && videoBox.y + videoBox.height > actions.y + actions.height, width + ' screenshots overlap behind download buttons');
        for (const name of ['Get Vanta for iPhone', 'Join the Android beta']) {
          const link = page.getByRole('link', { name, exact: true });
          assert(await link.evaluate(el => { const r = el.getBoundingClientRect(); return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)); }), name + ' stays above the screenshots and receives taps');
        }
      }
      assert(box.y + box.height <= height - 8, width + ' tour action is in the initial viewport');
      assert.equal(await page.locator('video').getAttribute('src'), null, 'Video still waits for user action');
      const closingTour = page.locator('#get-vanta').getByRole('button', { name: 'Watch the full app tour', exact: true });
      const closingBox = await closingTour.boundingBox();
      assert(closingBox.height >= 44 && closingBox.x >= 0 && closingBox.x + closingBox.width <= width, 'Closing tour action supports touch and fits the viewport');
      assert.equal(await page.getByRole('dialog').count(), 0, 'Player is closed initially');
      const android = page.getByRole('link', { name: 'Join the Android beta', exact: false }).first();
      assert.equal(await android.getAttribute('href'), 'https://play.google.com/apps/testing/vanta.tattoo');
      assert((await android.boundingBox()).height >= 44);
      assert(await page.locator('main').evaluate(el => el.parentElement.scrollWidth <= el.parentElement.clientWidth + 1), width + ' no page overflow');
      assert.equal(await page.locator('a[href^="/artist/account"]').count(), 0, 'No public account links');
      const download = page.getByRole('link', { name: 'Get Vanta for iPhone', exact: true });
      assert.match(await download.getAttribute('href'), /^https:\/\/apps.apple.com\//);
      assert((await download.boundingBox()).height >= 48);
      await page.screenshot({ path: path.join(output, `splash-${width}-viewport.png`) });
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Skip to content');
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => document.activeElement.id === 'artist-main');
      await download.focus();
      assert.notEqual(await download.evaluate(el => getComputedStyle(el).outlineStyle), 'none');
      assert.deepEqual(errors, []);
      assert.deepEqual(missing, []);
      // Expand only the scroll container for a complete splash review image.
      await page.addStyleTag({ content: 'html, body { height: auto !important; overflow: visible !important; } [class*="artists_navigation"] { position: relative !important; } [class*="artists_skipLink"] { visibility: hidden !important; }' });
      await page.locator('main').evaluate(el => { el.parentElement.style.height = 'auto'; el.parentElement.style.overflow = 'visible'; });
      await page.getByRole('region', { name: 'Your art. Less admin.' }).screenshot({ path: path.join(output, `splash-${width}-full.png`) });
      console.log(`PASS ${width}×${height}: first-viewport tour action, deferred media, touch targets, keyboard skip/focus, assets and overflow`);
      await page.close();
    }
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    let releaseMedia;
    const gate = new Promise(resolve => { releaseMedia = resolve; });
    await page.route('**/artist-app-tour.mp4', async route => { await gate; await route.continue(); });
    await page.goto(base + '/artists/');
    const closingTour = page.locator('#get-vanta').getByRole('button', { name: 'Watch the full app tour', exact: true });
    await closingTour.click();
    await page.getByRole('status').filter({ hasText: 'Loading the tour…' }).waitFor();
    const loadingLabels = await page.getByText('Loading the tour…', { exact: true }).all();
    const loadingBoxes = await Promise.all(loadingLabels.map(label => label.boundingBox()));
    assert(loadingBoxes.some(box => box && box.y >= 0 && box.y + box.height <= 844), 'Loading feedback stays in the initial phone viewport');
    await page.screenshot({ path: path.join(output, 'splash-loading.png') });
    const dialogBox = await page.getByRole('dialog', { name: 'Vanta app tour' }).boundingBox();
    assert.equal(dialogBox.x, 0); assert.equal(dialogBox.y, 0);
    const actualViewport = page.viewportSize();
    assert(dialogBox.width >= actualViewport.width && dialogBox.height >= actualViewport.height, 'Player fills the viewport');
    await page.getByRole('dialog').getByRole('button', { name: 'Pause tour', exact: true }).click();
    await page.getByRole('status').filter({ hasText: 'Loading the tour…' }).waitFor({ state: 'hidden' });
    assert(await page.locator('video').evaluate(v => v.paused));
    releaseMedia();
    await page.getByRole('dialog').getByRole('button', { name: 'Resume tour', exact: true }).click();
    await page.waitForFunction(() => { const v = document.querySelector('video'); return !v.paused && v.readyState >= 2; });
    await page.getByRole('status').filter({ hasText: 'Loading the tour…' }).waitFor({ state: 'hidden' });
    assert.equal(await page.getByRole('alert').filter({ hasText: 'The tour couldn’t play.' }).count(), 0);
    await page.locator('video').evaluate(video => { video.currentTime = 12; });
    await page.getByRole('button', { name: 'Close app tour' }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    assert(await page.locator('video').evaluate(v => v.paused));
    await page.waitForFunction(() => document.activeElement?.textContent.includes('Watch the full app tour'));
    assert(await closingTour.evaluate(el => el === document.activeElement), 'Closing player returns focus to the CTA');
    await page.getByRole('button', { name: 'Resume tour', exact: true }).click();
    await page.waitForFunction(() => { const video = document.querySelector('video'); return !video.paused && video.currentTime >= 12; });
    assert.equal(await page.locator('video').count(), 1, 'CTA and splash share one player and playback position');
    await page.getByRole('button', { name: 'Close app tour' }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    console.log('PASS closing CTA: fullscreen loading, pause, resume, close, focus restoration and shared progress with splash');
    await page.close();
    const motion = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });
    await motion.goto(base + '/artists/');
    await motion.getByRole('heading', { name: 'Your art. Less admin.' }).waitFor();
    await motion.waitForTimeout(800); // Allow the brief entrance to settle before capture.
    await motion.screenshot({ path: path.join(output, 'splash-motion-settled.png') });
    assert.equal(await motion.locator('video').getAttribute('src'), null);
    console.log('PASS normal-motion opening settles without starting media');
    await motion.close();
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
