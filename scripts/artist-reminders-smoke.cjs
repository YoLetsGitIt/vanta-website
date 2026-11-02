// Local marketing section checks: no billing/auth mutations or external mail calls.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.STUDIO_PLAYWRIGHT_PATH || 'playwright');
const base = process.env.PUBLIC_TEST_URL || 'http://127.0.0.1:3048';
const output = process.env.ARTIST_REVIEW_OUTPUT || '/private/tmp/vanta-reminders-review';
async function scrollToInbox(sender) {
  await sender.evaluate(el => {
    const root = el.closest('[data-theme]');
    root.scrollTo({ top: root.scrollTop + el.getBoundingClientRect().top - root.getBoundingClientRect().top, behavior: 'instant' });
  });
  await sender.page().waitForTimeout(100);
}
(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH });
  try {
    for (const width of [320,390,768,1440]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.goto(base + '/artists/');
      const section = page.locator('#your-reminders');
      await section.locator('[data-reminders-complete="true"]').waitFor();
      assert.equal(await section.getByText(/4\.99|per month|\/ month/).count(), 0, 'No pricing');
      assert.equal(await section.getByText('Free', { exact: true }).count(), 0, 'No Free badge in first step');
      assert.equal(await section.getByText('Set up in the app', { exact: true }).count(), 0, 'Setup instructions removed');
      assert.deepEqual(await section.locator('dd').evaluateAll(nodes => nodes.map(el => el.querySelectorAll('svg[aria-hidden="true"]').length)), [1,1,2], 'Email and SMS channels have decorative icons');
      assert.equal(await section.getByText('Gmail', { exact: true }).count(), 1);
      assert.equal(await section.getByText('Outlook', { exact: true }).count(), 1);
      assert.equal(await section.locator('a,button').count(), 0, 'Provider badges are informational');
      assert.equal(await section.locator('[data-reminder-mark]').count(), 3);
      assert.equal(await section.locator('[data-reminder-line]').count(), 2);
      for (const theme of ['dark','light','nature','space']) {
        await page.getByRole('button', { name: /^Change theme/ }).focus();
        await page.getByRole('button', { name: /^Change theme/ }).click();
        await page.getByRole('radio', { name: theme, exact: false }).click(); await page.keyboard.press('Escape');
        assert(await page.locator('[data-theme]').evaluate(el => el.scrollWidth <= el.clientWidth + 1));
        assert(await section.locator('[data-reminder-mark]').evaluateAll(nodes => nodes.every(el => el.dataset.delivered === 'true')));
        assert.equal(await page.evaluate(() => document.getAnimations().length), 0, 'Reduced motion has no pulses');
        await page.addStyleTag({ content: 'html,body{height:auto!important;overflow:visible!important;}[data-theme]{height:auto!important;overflow:visible!important;}[class*="artists_navigation"]{position:relative!important;}[class*="artists_skipLink"]{visibility:hidden!important;}' });
        if (theme === 'dark' || width === 390) await section.screenshot({ path: path.join(output, `${theme}-${width}.png`) });
      }
      await section.evaluate(el => {
        const nodes = [...el.querySelectorAll('h2,h3,p,dt,dd')]; const sizes = nodes.map(n => parseFloat(getComputedStyle(n).fontSize));
        nodes.forEach((n,i) => { n.style.fontSize = `${sizes[i] * 1.5}px`; });
      });
      assert(await page.locator('[data-theme]').evaluate(el => el.scrollWidth <= el.clientWidth + 1), '150% text fits');
      assert.deepEqual(errors, []);
      console.log(`PASS ${width}: no pricing, Gmail/Outlook setup, all themes, reduced motion, 150% text and no overflow`);
      await page.close();
    }
    for (const width of [390,1440]) {
      const speed = width > 760 ? 1.1 : 1;
      const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: 'no-preference' });
      await page.addInitScript(() => {
        window.reminderEffects = [];
        window.inboxEffects = [];
        const native = Element.prototype.animate;
        Element.prototype.animate = function (frames, options) {
          const animation = native.call(this, frames, options);
          if (this.matches('[data-reminder-mark],[data-reminder-line],[data-reminder-halo],[data-reminder-effect]')) {
            animation.pause(); animation.currentTime = 0;
            window.reminderEffects.push({ animation, frames, options, type: this.hasAttribute('data-reminder-line') ? 'line' : this.hasAttribute('data-reminder-mark') ? 'mark' : this.hasAttribute('data-reminder-halo') ? 'halo' : this.dataset.reminderEffect });
          } else if (this.matches('[data-inbox-part]')) {
            animation.pause(); animation.currentTime = 0;
            window.inboxEffects.push({ animation, frames, options });
          }
          return animation;
        };
      });
      await page.goto(base + '/artists/');
      await page.getByRole('button', { name: /^Change theme/ }).waitFor();
      await page.locator('[aria-label="Client notification schedule"]').evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
      await page.waitForFunction(() => window.reminderEffects.length === 22);
      const sender = page.locator('[data-artist-reveal="after-notifications"]');
      const arrow = sender.locator('[data-inbox-arrow]');
      assert.equal(await arrow.getAttribute('aria-hidden'), 'true', 'Arrow is decorative');
      assert.equal(await arrow.evaluate(el => el.getAnimations().length), 0, 'Arrow waits for the inbox reveal');
      assert.equal(await sender.evaluate(el => getComputedStyle(el).opacity), '0', 'Inbox setup waits for the reminder animation');
      assert.equal(await sender.evaluate(el => el.getAnimations().length), 0, 'Entering the viewport alone does not animate inbox setup');
      const delays = await page.evaluate(() => window.reminderEffects.filter(e => e.type === 'mark').map(e => e.options.delay));
      const timingMatches = (actual, expected) => actual.length === expected.length && actual.every((value, index) => Math.abs(value - expected[index] / speed) < .01);
      assert(timingMatches(delays, [0,1520,3040]));
      assert(timingMatches(await page.evaluate(() => window.reminderEffects.filter(e => e.type === 'line').map(e => e.options.delay)), [960,2480]));
      const duration = await page.evaluate(() => Math.max(...window.reminderEffects.map(e => e.options.delay + e.options.duration)));
      assert(Math.abs(duration - 4240 / speed) < .01, 'Horizontal reminders run 10% faster; mobile timing is preserved');
      const colours = () => page.locator('[data-reminder-mark]').evaluateAll(nodes => nodes.map(el => getComputedStyle(el).color));
      const seek = time => page.evaluate(time => window.reminderEffects.forEach(e => { e.animation.currentTime = time; }), time / speed);
      await seek(1160);
      const first = await colours(); assert.notEqual(first[0], first[1]); assert.equal(first[1], first[2], 'First pulse precedes later markers');
      await page.screenshot({ path: path.join(output, `pulse-1-${width}.png`) });
      await seek(2680);
      const second = await colours(); assert.equal(second[0], second[1]); assert.notEqual(second[1], second[2], 'Second marker waits for line arrival');
      await page.screenshot({ path: path.join(output, `pulse-2-${width}.png`) });
      await seek(3440);
      const clock = page.locator('[data-reminder-kind="day"]');
      assert(Math.abs(await clock.locator('[data-reminder-effect="minute"]').evaluate(el => parseFloat(getComputedStyle(el).rotate)) - 180) < .1, 'Clock hand sweeps before becoming 24h');
      assert.equal(await clock.locator('[data-reminder-effect="value"]').evaluate(el => getComputedStyle(el).opacity), '0');
      assert.equal(await clock.locator('[data-reminder-effect="glyph"]').evaluate(el => getComputedStyle(el).opacity), '1', 'Clock stays fully visible through the sweep');
      await page.screenshot({ path: path.join(output, `clock-sweep-${width}.png`) });
      await seek(4160);
      assert.equal(await clock.locator('[data-reminder-effect="glyph"]').evaluate(el => getComputedStyle(el).opacity), '0');
      assert.equal(await clock.locator('[data-reminder-effect="value"]').evaluate(el => getComputedStyle(el).opacity), '1');
      assert.equal(await page.locator('[data-reminder-kind="confirmation"] [data-reminder-effect="check"]').evaluate(el => getComputedStyle(el).strokeDashoffset), '0px', 'Confirmation check draws completely');
      assert.equal(await sender.evaluate(el => getComputedStyle(el).opacity), '0', 'Inbox setup still waits for the final pulse to finish');
      const axis = await page.evaluate(() => window.reminderEffects.find(e => e.type === 'line').frames[0].transform);
      assert.equal(axis, width < 761 ? 'scaleY(0)' : 'scaleX(0)');
      await page.locator('#get-vanta').evaluate(el => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
      await page.waitForTimeout(100);
      await scrollToInbox(sender);
      assert.equal(await page.evaluate(() => window.reminderEffects.length), 22, 'Scrolling away mid-animation does not start another run');
      assert.equal(await sender.evaluate(el => getComputedStyle(el).opacity), '0', 'Inbox still waits for the original sequence');
      await page.evaluate(() => window.reminderEffects.forEach(e => e.animation.finish()));
      await page.waitForFunction(() => document.querySelector('[data-artist-reveal="notifications"]').dataset.revealState === 'complete');
      await page.waitForFunction(() => window.inboxEffects.length === 3);
      assert.deepEqual(await page.evaluate(() => window.inboxEffects.map(e => e.options.delay)), [0,160,320], 'Inbox heading, copy and logos enter in order');
      assert(await page.evaluate(() => window.inboxEffects.every(e => e.frames[0].translate === '0 -10px')), 'Inbox content enters from above');
      await page.evaluate(() => window.inboxEffects.forEach(e => { e.animation.currentTime = 100; }));
      const inboxOpacity = () => sender.locator('[data-inbox-part]').evaluateAll(nodes => nodes.map(el => Number(getComputedStyle(el).opacity)));
      const headingFirst = await inboxOpacity();
      assert(headingFirst[0] > 0 && headingFirst[1] === 0 && headingFirst[2] === 0, 'Heading appears before the copy and logos');
      await page.evaluate(() => window.inboxEffects.forEach(e => { e.animation.currentTime = 260; }));
      const copyNext = await inboxOpacity();
      assert(copyNext[0] > copyNext[1] && copyNext[1] > 0 && copyNext[2] === 0, 'Copy follows the heading before logos appear');
      await page.screenshot({ path: path.join(output, `inbox-stagger-${width}.png`) });
      await page.evaluate(() => window.inboxEffects.forEach(e => e.animation.finish()));
      await page.waitForFunction(() => document.querySelector('[data-artist-reveal="after-notifications"]').dataset.revealState === 'complete');
      assert.equal(await sender.evaluate(el => getComputedStyle(el).opacity), '1', 'Inbox setup appears after the full reminder sequence');
      const bob = await arrow.evaluate(el => {
        const animation = el.getAnimations()[0];
        animation.pause(); animation.currentTime = 0;
        const top = new DOMMatrixReadOnly(getComputedStyle(el).transform).f;
        animation.currentTime = 900;
        const bottom = new DOMMatrixReadOnly(getComputedStyle(el).transform).f;
        const repeats = animation.effect.getTiming().iterations === Infinity;
        animation.play();
        return { top, bottom, repeats };
      });
      assert(bob.repeats && Math.abs(bob.bottom - bob.top - 5) < .1, 'Down arrow gently bobs through a five-pixel range');
      const final = await colours(); assert.equal(new Set(final).size, 1);
      await page.locator('#get-vanta').evaluate(el => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
      await page.waitForTimeout(100);
      await page.locator('[aria-label="Client notification schedule"]').evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
      await page.waitForTimeout(100);
      assert.equal(await page.evaluate(() => window.reminderEffects.length), 22, 'Returning never replays the reminder sequence');
      assert.equal(await page.evaluate(() => window.inboxEffects.length), 3, 'Returning never replays the inbox reveal');
      assert.equal(await sender.evaluate(el => getComputedStyle(el).opacity), '1');
      assert.deepEqual(await colours(), final, 'Completed markers stay green on return');
      await page.close();
      console.log(`PASS ${width}: faster reminder sequence, top-down inbox stagger and once-only playback`);
    }
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'no-preference' });
    await page.goto(base + '/artists/'); await page.getByRole('button', { name: /^Change theme/ }).waitFor();
    await page.locator('[aria-label="Client notification schedule"]').evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await page.waitForFunction(() => document.querySelector('[data-artist-reveal="notifications"]').dataset.revealState === 'running');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => document.getAnimations().length === 0);
    assert(await page.locator('[data-reminder-mark]').evaluateAll(nodes => nodes.every(el => el.dataset.delivered === 'true')));
    assert.equal(await page.locator('[data-artist-reveal="after-notifications"]').evaluate(el => getComputedStyle(el).opacity), '1', 'Reduced motion exposes the inbox setup immediately');
    assert(await page.locator('[data-inbox-part]').evaluateAll(nodes => nodes.every(el => getComputedStyle(el).opacity === '1')), 'Reduced motion exposes every inbox part');
    console.log('PASS switching reduced motion during sequence cancels pulses and leaves a complete static timeline');
    await page.close();
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
