const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.STUDIO_PLAYWRIGHT_PATH || 'playwright');
const base = process.env.PUBLIC_TEST_URL || 'http://127.0.0.1:3048';
const output = process.env.ARTIST_REVIEW_OUTPUT || '/private/tmp/vanta-policy-flow-review';
(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH });
  try {
    for (const width of [390, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 } });
      const errors = []; page.on('pageerror', error => errors.push(error.message));
      await page.goto(base + '/artists/');
      const section = page.locator('#your-day');
      const tab = section.getByRole('tab', { name: 'Deposits & consent forms', exact: true });
      const calendar = section.getByRole('tab', { name: 'Working hours & calendar', exact: true });
      await tab.click();
      await section.getByRole('tabpanel').scrollIntoViewIfNeeded();
      const phone = section.locator('[data-app-preview]');
      const step = () => phone.locator('[data-policy-step][data-active="true"]').getAttribute('data-policy-step');
      await phone.locator('[data-policy-step] img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
      await page.waitForFunction(() => document.querySelector('[data-artist-reveal="day-scene"]').dataset.revealState === 'complete');
      await calendar.click(); await tab.click();
      await section.getByRole('tabpanel').scrollIntoViewIfNeeded();
      assert.equal(await step(), '0', 'Starts with deposit confirmation');
      const dimensions = await phone.boundingBox();
      for (const index of [1, 0]) {
        await page.waitForFunction(value => document.querySelector('[data-policy-step][data-active="true"]').dataset.policyStep === String(value), index, { timeout: 7000 });
        const frame = phone.locator(`[data-policy-step="${index}"]`);
        assert.equal(await frame.locator('[data-native-theme="dark"]').evaluate(image => image.complete && image.naturalWidth === 1206), true, 'Capture is ready before switching');
        assert.equal(await frame.evaluate(el => getComputedStyle(el).transitionDuration), '0.65s');
        await page.waitForFunction(value => getComputedStyle(document.querySelector(`[data-policy-step="${value}"]`)).opacity === '1', index, { timeout: 2000 });
        const bounds = await phone.boundingBox();
        assert.equal(bounds.width, dimensions.width); assert.equal(bounds.height, dimensions.height);
        await page.screenshot({ path: path.join(output, `${index ? 'consent' : 'deposit'}-${width}.png`) });
      }
      await page.clock.install();
      await calendar.click(); await tab.click();
      await section.getByRole('tabpanel').scrollIntoViewIfNeeded();
      await section.getByRole('button', { name: 'Pause deposit and consent preview', exact: true }).click();
      await page.clock.fastForward(12000);
      assert.equal(await step(), '0', 'Explicit pause holds deposit screen');
      await section.getByRole('button', { name: 'Preview consent form', exact: true }).click();
      await page.clock.fastForward(12000);
      assert.equal(await step(), '1', 'Manual choice pauses on consent');
      await section.getByRole('tab', { name: 'Add appointments on the go', exact: true }).click();
      await section.getByRole('tabpanel').scrollIntoViewIfNeeded();
      await phone.locator('[data-appointment-step] img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
      await page.waitForTimeout(100);
      await page.clock.fastForward(2400);
      await page.waitForFunction(() => document.querySelector('[data-appointment-step][data-active="true"]').dataset.appointmentStep === '1');
      await tab.click();
      assert.equal(await step(), '0', 'Returning starts at deposit');
      assert.equal(await section.getByRole('button', { name: 'Play deposit and consent preview', exact: true }).count(), 1, 'Pause preference belongs to its own preview');
      await section.getByRole('button', { name: 'Play deposit and consent preview', exact: true }).click();
      await page.locator('[data-theme]').evaluate(el => el.scrollTo({ top: 0, behavior: 'instant' }));
      await page.waitForTimeout(100); await page.clock.fastForward(12000);
      assert.equal(await step(), '0', 'Offscreen preview pauses');
      await section.getByRole('tabpanel').scrollIntoViewIfNeeded();
      await page.waitForTimeout(100); await page.clock.fastForward(2400);
      await page.waitForFunction(() => document.querySelector('[data-policy-step][data-active="true"]').dataset.policyStep === '1');
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.waitForTimeout(100); await page.clock.fastForward(12000);
      assert.equal(await step(), '1', 'Reduced motion stops automatic switching');
      assert.deepEqual(errors, []);
      console.log(`PASS ${width}: deposit → consent → deposit, decoded crossfades, stable phone, pause/manual controls, independent appointment playback, offscreen and reduced-motion pause`);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
