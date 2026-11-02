const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.STUDIO_PLAYWRIGHT_PATH || 'playwright');
const base = process.env.PUBLIC_TEST_URL || 'http://127.0.0.1:3048';
const output = process.env.ARTIST_REVIEW_OUTPUT || '/private/tmp/vanta-appointment-flow-review';
(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH });
  try {
    for (const width of [390, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 } });
      const errors = []; page.on('pageerror', error => errors.push(error.message));
      await page.goto(base + '/artists/');
      const section = page.locator('#your-day');
      await section.getByRole('tab', { name: 'Add appointments on the go', exact: true }).click();
      await section.locator('[role="tabpanel"]').scrollIntoViewIfNeeded();
      const phone = section.locator('[data-app-preview]');
      const activeStep = () => phone.locator('[data-appointment-step][data-active="true"]').getAttribute('data-appointment-step');
      await phone.locator('[data-appointment-step] img').evaluateAll(images => Promise.all(images.map(img => img.decode())));
      // Verify the real animation before using controlled time for pause checks.
      await page.waitForFunction(() => document.querySelector('[data-artist-reveal="day-scene"]').dataset.revealState === 'complete');
      assert.equal(await phone.evaluate(el => getComputedStyle(el).opacity), '1');
      await section.getByRole('tab', { name: 'Working hours & calendar', exact: true }).click();
      await section.getByRole('tab', { name: 'Add appointments on the go', exact: true }).click();
      await section.locator('[role="tabpanel"]').scrollIntoViewIfNeeded();
      await page.waitForTimeout(100);
      assert.equal(await activeStep(), '0');
      const dimensions = await phone.boundingBox();
      for (const index of [1, 2, 0]) {
        await page.waitForFunction(value => document.querySelector('[data-appointment-step][data-active="true"]').dataset.appointmentStep === String(value), index, { timeout: 7000 });
        const step = phone.locator(`[data-appointment-step="${index}"]`);
        assert.equal(await step.locator('[data-native-theme="dark"]').evaluate(img => img.complete && img.naturalWidth === 1206), true, 'Next capture decoded before transition');
        assert.equal(await step.evaluate(el => getComputedStyle(el).transitionDuration), '0.65s', 'Screens crossfade instead of cutting');
        await page.waitForFunction(value => getComputedStyle(document.querySelector(`[data-appointment-step="${value}"]`)).opacity === '1', index, { timeout: 2000 });
        const bounds = await phone.boundingBox();
        assert.equal(bounds.width, dimensions.width); assert.equal(bounds.height, dimensions.height);
        if (index === 2) await page.screenshot({ path: path.join(output, `schedule-${width}.png`) });
      }
      await page.clock.install();
      await section.getByRole('tab', { name: 'Working hours & calendar', exact: true }).click();
      await section.getByRole('tab', { name: 'Add appointments on the go', exact: true }).click();
      await section.locator('[role="tabpanel"]').scrollIntoViewIfNeeded();
      await section.getByRole('button', { name: 'Pause appointment preview', exact: true }).click();
      const paused = await activeStep();
      await page.clock.fastForward(12000);
      assert.equal(await activeStep(), paused, 'Pause keeps the chosen screen');
      await section.getByRole('button', { name: 'Preview step 3: Date & time', exact: true }).click();
      assert.equal(await activeStep(), '2');
      await page.clock.fastForward(12000);
      assert.equal(await activeStep(), '2', 'Manual selection pauses autoplay');
      await section.getByRole('button', { name: 'Play appointment preview', exact: true }).click();
      await page.locator('[data-theme]').evaluate(el => el.scrollTo({ top: 0, behavior: 'instant' }));
      await page.waitForTimeout(100);
      const offscreen = await activeStep();
      await page.clock.fastForward(12000);
      assert.equal(await activeStep(), offscreen, 'Offscreen preview pauses');
      await section.locator('[role="tabpanel"]').scrollIntoViewIfNeeded();
      await page.waitForTimeout(100);
      await page.clock.fastForward(2400);
      await page.waitForFunction(value => document.querySelector('[data-appointment-step][data-active="true"]').dataset.appointmentStep !== value, offscreen);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.waitForTimeout(100);
      const reduced = await activeStep();
      await page.clock.fastForward(12000);
      assert.equal(await activeStep(), reduced, 'Live reduced-motion preference stops autoplay');
      assert.equal(await section.getByRole('button', { name: /^(Play|Pause) appointment preview$/ }).count(), 0);
      await section.getByRole('tab', { name: 'Working hours & calendar', exact: true }).click();
      await section.getByRole('tab', { name: 'Add appointments on the go', exact: true }).click();
      assert.equal(await activeStep(), '0', 'Reopening starts at the client step');
      assert.deepEqual(errors, []);
      console.log(`PASS ${width}: 1 → 2 → 3 → 1, decoded captures, crossfade, stable frame, pause/play, manual steps, offscreen pause, reduced motion, reset`);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
