// Local public-page checks: motion lifecycle, access and graceful fallbacks.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.STUDIO_PLAYWRIGHT_PATH || 'playwright');
const base = process.env.PUBLIC_TEST_URL || 'http://127.0.0.1:3048';
const output = process.env.ARTIST_REVIEW_OUTPUT || '/private/tmp/vanta-artist-motion-review';
const rootSelector = '[data-theme]';
async function scan(page) {
  // Scroll the real app container, including the middle of the longer sections.
  const metrics = await page.locator(rootSelector).evaluate(el => ({ height: el.clientHeight, end: el.scrollHeight - el.clientHeight }));
  for (let top = 0; top < metrics.end + metrics.height; top += metrics.height * .6) {
    await page.locator(rootSelector).evaluate((el, top) => el.scrollTo({ top, behavior: 'instant' }), top);
    await page.waitForTimeout(35);
  }
  await page.waitForFunction(() => document.getAnimations().filter(animation => !animation.effect?.target?.matches('[data-inbox-arrow]')).length === 0, null, { timeout: 6000 });
}
async function instrument(page, fallback) {
  await page.addInitScript(fallback => {
    window.motionCalls = [];
    if (fallback === 'observer') window.IntersectionObserver = undefined;
    if (fallback === 'animate') Element.prototype.animate = undefined;
    if (Element.prototype.animate) {
      const native = Element.prototype.animate;
      Element.prototype.animate = function (frames, options) {
        window.motionCalls.push({ section: this.closest('section')?.id || (this.closest('#artist-tour') ? 'hero' : 'opening'), variant: this.dataset.artistReveal || 'detail', tag: this.tagName, options });
        return native.call(this, frames, options);
      };
    }
  }, fallback);
}
(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH });
  try {
    const results = [];
    for (const width of [320,390,768,1440]) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'no-preference' });
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      await instrument(page);
      await page.goto(base + '/artists/');
      await page.waitForFunction(() => window.motionCalls.length > 0);
      await scan(page);
      // Fast scrolling can pass inbox setup before its preceding sequence ends.
      // Return once to let that deferred content make its first entrance.
      await page.locator('[data-artist-reveal="after-notifications"]').scrollIntoViewIfNeeded();
      await page.waitForFunction(() => document.querySelector('[data-artist-reveal="after-notifications"]').dataset.revealState === 'complete');
      for (const id of ['your-work','your-bookings','your-reminders','your-day','get-vanta']) {
        assert(await page.evaluate(id => window.motionCalls.some(call => call.section === id), id), id + ' animates');
      }
      const settled = await page.locator(rootSelector).evaluate(el => [...el.querySelectorAll('[data-artist-reveal]')].every(node => {
        const opacity = node.dataset.artistReveal === 'after-notifications' && node.dataset.revealState === 'waiting' ? '0' : '1';
        return getComputedStyle(node).opacity === opacity && getComputedStyle(node).translate === 'none';
      }));
      assert(settled, 'All entrance effects settle without retained styles');
      assert.equal(await page.evaluate(() => document.getAnimations().filter(animation => !animation.effect?.target?.matches('[data-inbox-arrow]')).length), 0, 'Entrance animations finish; only the decorative arrow may keep bobbing');
      assert(await page.locator(rootSelector).evaluate(el => el.scrollWidth <= el.clientWidth + 1), 'No horizontal overflow');
      const count = await page.evaluate(() => window.motionCalls.length);
      await page.locator(rootSelector).evaluate(el => el.scrollTo({ top: 0, behavior: 'instant' }));
      await scan(page);
      assert.equal(await page.evaluate(() => window.motionCalls.length), count, 'All entrance effects play once, including reminders and inbox setup');
      await page.locator(rootSelector).evaluate(el => el.scrollTo({ top: 0, behavior: 'instant' }));
      await page.getByRole('button', { name: /^Change theme/ }).click();
      await page.getByRole('radio', { name: 'Space', exact: true }).click();
      await page.keyboard.press('Escape');
      assert.equal(await page.evaluate(() => window.motionCalls.length), count, 'Changing theme never replays motion');
      await page.getByRole('button', { name: 'Watch the app tour', exact: true }).click();
      await page.waitForFunction(() => { const v = document.querySelector('video'); return !v.paused && v.readyState >= 2; });
      await page.getByRole('button', { name: 'Close app tour' }).click();
      assert(await page.locator('video').evaluate(v => v.paused));
      await page.waitForFunction(() => document.activeElement.getAttribute('aria-controls') === 'artist-tour-player');
      assert.deepEqual(errors, []);
      const calls = await page.evaluate(() => window.motionCalls);
      results.push({ width, effects: calls.length, sections: [...new Set(calls.map(c => c.section))] });
      console.log(`PASS ${width}: all entrances play once, motion settles, themes and fullscreen playback work`);
      await page.close();
    }
    const reduced = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    await instrument(reduced); await reduced.goto(base + '/artists/');
    await reduced.getByRole('button', { name: /^Change theme/ }).waitFor(); await scan(reduced);
    assert.equal(await reduced.evaluate(() => window.motionCalls.length), 0, 'Reduced motion never starts an entrance effect');
    assert.equal(await reduced.evaluate(() => document.getAnimations().length), 0);
    console.log('PASS reduced motion: all content available with no entrance effects');
    await reduced.close();

    const toggle = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'no-preference' });
    await instrument(toggle); await toggle.goto(base + '/artists/');
    await toggle.waitForFunction(() => document.getAnimations().length > 0);
    await toggle.emulateMedia({ reducedMotion: 'reduce' });
    await toggle.waitForFunction(() => document.getAnimations().length === 0);
    const before = await toggle.evaluate(() => window.motionCalls.length); await scan(toggle);
    assert.equal(await toggle.evaluate(() => window.motionCalls.length), before, 'Changing preference cancels motion and prevents new effects');
    console.log('PASS live reduced-motion change cancels active effects and disables further reveals');
    await toggle.close();

    const focus = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'no-preference' });
    await instrument(focus); await focus.goto(base + '/artists/');
    await focus.waitForFunction(() => document.querySelector('[class*="heroActions"]').getAnimations().length > 0);
    const store = focus.getByRole('link', { name: 'Get Vanta for iPhone', exact: true });
    await store.focus();
    assert.equal(await store.evaluate(el => el.parentElement.getAnimations().length), 0, 'Keyboard focus cancels a containing entrance effect');
    assert(await store.evaluate(el => document.activeElement === el));
    console.log('PASS keyboard focus makes moving controls settle immediately');
    await focus.close();

    for (const fallback of ['observer','animate','javascript']) {
      const context = await browser.newContext({ javaScriptEnabled: fallback !== 'javascript', viewport: { width: 390, height: 844 } });
      const page = await context.newPage();
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      if (fallback !== 'javascript') await instrument(page, fallback);
      await page.goto(base + '/artists/');
      await page.getByRole('heading', { name: 'Your art. Less admin.' }).waitFor();
      for (const id of ['your-work','your-bookings','your-reminders','your-day','get-vanta']) {
        await page.locator('#' + id).scrollIntoViewIfNeeded();
        assert(await page.locator('#' + id).evaluate(el => getComputedStyle(el).opacity === '1'), 'Content remains visible');
      }
      assert.equal(await page.locator('#get-vanta a').count(), 2);
      assert.deepEqual(errors, []);
      console.log(`PASS ${fallback} unavailable: all sections and both download links remain accessible`);
      await context.close();
    }
    fs.writeFileSync(path.join(output, 'review.json'), JSON.stringify(results, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
