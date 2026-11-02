// Public-page browser review: local media only; no authentication or account writes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.STUDIO_PLAYWRIGHT_PATH || 'playwright');
const base = process.env.PUBLIC_TEST_URL || 'http://127.0.0.1:3048';
const output = process.env.ARTIST_REVIEW_OUTPUT || '/private/tmp/vanta-artist-landing-polish';
(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH });
  try {
    for (const width of process.env.ARTIST_REVIEW_ONLY_RECOVERY ? [] : [1440, 768, 390, 320]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(base + '/artists/');
      await page.getByRole('button', { name: 'Watch the app tour', exact: true }).waitFor();
      assert.equal(await page.locator('video').getAttribute('src'), null);
      assert.equal(await page.locator('a[href^="/artist/account"]').count(), 0, 'Account page is accessed from app only');
      await page.screenshot({ path: path.join(output, `artist-${width}-opening.png`) });
      assert.equal(await page.getByRole('navigation', { name: 'Artist tools' }).count(), 0, 'No redundant overview navigation');
      for (const id of ['your-work', 'your-bookings', 'your-reminders', 'your-day']) {
        assert.equal(await page.locator('#' + id).count(), 1, 'Feature chapter remains available: ' + id);
      }
      await page.locator('#your-reminders').scrollIntoViewIfNeeded();
      assert.equal(await page.getByText('Set up in the app', { exact: true }).count(), 0, 'Setup instructions removed');
      assert.equal(await page.locator('#your-reminders').getByText(/4\.99|per month|\/ month/).count(), 0, 'No pricing in reminders section');
      await page.locator('#your-reminders').getByRole('heading', { name: 'Sent from your inbox.' }).waitFor();
      assert.equal(await page.locator('#your-reminders').getByText('Free', { exact: true }).count(), 0);
      assert.equal(await page.getByRole('link', { name: 'Set up your subscription' }).count(), 0);
      assert(await page.locator('main').evaluate(el => el.parentElement.scrollWidth <= el.parentElement.clientWidth + 1), 'No page overflow at ' + width);
      // Expand only the scroll container for full section review captures.
      await page.addStyleTag({ content: 'html, body { height: auto !important; overflow: visible !important; } [class*="artists_navigation"] { position: relative !important; } [class*="artists_skipLink"] { visibility: hidden !important; }' });
      await page.locator('main').evaluate(el => { el.parentElement.style.height = 'auto'; el.parentElement.style.overflow = 'visible'; });
      await page.locator('img').evaluateAll(images => Promise.all(images.map(image => { image.loading = 'eager'; return image.decode().catch(() => {}); })));
      await page.locator('main > section').first().screenshot({ path: path.join(output, `artist-${width}-hero.png`) });
      await page.locator('#your-work').screenshot({ path: path.join(output, `artist-${width}-portfolio.png`) });
      await page.locator('#your-day').screenshot({ path: path.join(output, `artist-${width}-calendar.png`) });
      await page.getByRole('region', { name: 'Reminders, handled.' }).screenshot({ path: path.join(output, `artist-${width}-reminders.png`) });
      if (width === 1440 || width === 390) {
        await page.locator('#your-bookings').screenshot({ path: path.join(output, `artist-${width}-bookings.png`) });
        await page.getByRole('region', { name: 'Make room for your best work.' }).screenshot({ path: path.join(output, `artist-${width}-closing.png`) });
      }
      const video = page.locator('video');
      await page.getByRole('button', { name: 'Watch the app tour', exact: true }).click();
      await page.waitForFunction(() => { const v = document.querySelector('video'); return !v.paused && v.readyState >= 2; });
      await page.getByRole('dialog').getByRole('button', { name: 'Pause tour', exact: true }).click();
      assert(await video.evaluate(v => v.paused));
      await video.evaluate(v => { v.currentTime = 35.5; });
      await page.waitForFunction(() => !document.querySelector('video').seeking);
      await page.getByRole('dialog').getByRole('button', { name: 'Resume tour', exact: true }).click();
      await page.waitForFunction(() => { const v = document.querySelector('video'); return !v.paused && v.currentTime >= 35.5; });
      await video.evaluate(v => { v.currentTime = v.duration - .1; });
      await page.getByRole('dialog').getByRole('button', { name: 'Watch again', exact: true }).waitFor();
      await page.getByRole('dialog').getByRole('button', { name: 'Watch again', exact: true }).click();
      await page.waitForFunction(() => { const v = document.querySelector('video'); return !v.paused && v.currentTime < 5; });
      await page.waitForFunction(() => document.querySelector('video').currentTime > 1);
      await page.screenshot({ path: path.join(output, `artist-${width}-fullscreen.png`) });
      await page.getByRole('button', { name: 'Close app tour' }).click();
      await page.getByRole('dialog').waitFor({ state: 'hidden' });
      assert(await video.evaluate(v => v.paused));
      await page.waitForFunction(() => document.activeElement.getAttribute('aria-controls') === 'artist-tour-player');
      if (width === 1440 || width === 390) {
        const position = await video.evaluate(v => v.currentTime);
        await page.getByRole('button', { name: 'Open the app tour', exact: true }).click();
        await page.waitForFunction(position => { const v = document.querySelector('video'); return !v.paused && v.currentTime >= position; }, position);
        for (let tab = 0; tab < 5; tab++) {
          await page.keyboard.press('Tab');
          assert(await page.getByRole('dialog').evaluate(el => !document.hasFocus() || el.contains(document.activeElement)), 'Tab cannot focus the underlying page (browser chrome is allowed)');
        }
        await page.keyboard.press('Escape');
        await page.getByRole('dialog').waitFor({ state: 'hidden' });
        assert(await video.evaluate(v => v.paused));
        await page.waitForFunction(() => document.activeElement.getAttribute('aria-controls') === 'artist-tour-player');
      }
      assert.deepEqual(errors, []);
      console.log(`PASS ${width}: no public account link, section navigation, pricing clarity, layout, play/pause/resume/replay`);
      await page.close();
    }
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    let failMedia = true;
    await page.route('**/artist-app-tour.mp4*', route => failMedia ? route.abort() : route.continue());
    await page.addInitScript(() => { Element.prototype.requestFullscreen = undefined; });
    await page.goto(base + '/artists/');
    await page.getByRole('button', { name: 'Watch the app tour', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'The tour couldn’t play.' }).waitFor();
    assert.equal(await page.getByRole('link', { name: 'open the video' }).getAttribute('href'), '/studio/artist/demos/artist-app-tour.mp4?v=20261030');
    await page.screenshot({ path: path.join(output, 'artist-tour-error.png') });
    failMedia = false;
    await page.getByRole('button', { name: 'Try again', exact: true }).click();
    await page.waitForFunction(() => { const v = document.querySelector('video'); return !v.paused && v.readyState >= 2; });
    await page.getByRole('alert').filter({ hasText: 'The tour couldn’t play.' }).waitFor({ state: 'hidden' });
    assert(await page.getByRole('dialog').isVisible());
    await page.keyboard.press('Escape');
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    assert(await page.locator('video').evaluate(v => v.paused));
    console.log('PASS fullscreen fallback, network failure, retry and Escape dismissal');
    await page.close();

    const buffering = await browser.newPage({ viewport: { width: 390, height: 844 } });
    let releaseMedia;
    const mediaGate = new Promise(resolve => { releaseMedia = resolve; });
    await buffering.route('**/artist-app-tour.mp4*', async route => { await mediaGate; await route.continue(); });
    await buffering.goto(base + '/artists/');
    await buffering.getByRole('button', { name: 'Watch the app tour', exact: true }).click();
    await buffering.getByRole('dialog').getByRole('button', { name: 'Pause tour', exact: true }).click();
    await buffering.getByRole('dialog').getByRole('button', { name: 'Resume tour', exact: true }).waitFor();
    assert(await buffering.locator('video').evaluate(v => v.paused));
    releaseMedia();
    await buffering.getByRole('dialog').getByRole('button', { name: 'Resume tour', exact: true }).click();
    await buffering.waitForFunction(() => { const v = document.querySelector('video'); return !v.paused && v.readyState >= 2; });
    assert.equal(await buffering.getByRole('alert').filter({ hasText: 'The tour couldn’t play.' }).count(), 0);
    console.log('PASS pausing during buffering does not create a playback error');
    await buffering.close();
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
