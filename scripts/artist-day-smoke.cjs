const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.STUDIO_PLAYWRIGHT_PATH || 'playwright');
const base = process.env.PUBLIC_TEST_URL || 'http://127.0.0.1:3048';
const output = process.env.ARTIST_REVIEW_OUTPUT || '/private/tmp/vanta-day-review';

async function instrument(page) {
  await page.addInitScript(() => {
    window.dayEffects = [];
    const native = Element.prototype.animate;
    Element.prototype.animate = function(frames, options) {
      if (this.closest('#your-day')) {
        const part = this.hasAttribute('data-day-line') ? 'headline' : this.hasAttribute('data-day-calendar') ? 'calendar' : this.hasAttribute('data-day-booking') ? 'booking' : this.hasAttribute('data-app-preview') ? 'phone' : 'other';
        window.dayEffects.push({ part, starts: performance.now() + (options.delay || 0), duration: options.duration });
      }
      return native.call(this, frames, options);
    };
  });
}

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH });
  try {
    for (const width of [320, 390, 768, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.goto(base + '/artists/');
      await page.getByRole('button', { name: /^Change theme/ }).waitFor();
      const section = page.locator('#your-day');
      const phone = section.locator('[data-app-preview]');
      for (const theme of ['dark', 'light', 'nature', 'space']) {
        await page.locator('[data-theme]').evaluate(el => el.scrollTo({ top: 0, behavior: 'instant' }));
        await page.getByRole('button', { name: /^Change theme/ }).click();
        await page.getByRole('radio', { name: theme, exact: false }).click();
        await page.keyboard.press('Escape');
        await section.scrollIntoViewIfNeeded();
        const img = phone.locator(`[data-day-screen]:not([hidden]) [data-native-theme="${theme}"]`);
        await img.evaluate(el => el.decode());
        assert.equal(await img.evaluate(el => el.naturalWidth), 1206, 'Full-resolution native capture loads');
        assert.equal(await img.evaluate(el => getComputedStyle(el).opacity), '1');
        assert.equal(await phone.locator('[data-day-screen]:not([hidden]) img').evaluateAll(imgs => imgs.filter(el => getComputedStyle(el).opacity === '1').length), 1);
        const bounds = await section.evaluate(el => {
          const figure = el.querySelector('figure').getBoundingClientRect();
          const phone = el.querySelector('[data-app-preview]').getBoundingClientRect();
          const details = el.querySelector('[role="tablist"]').getBoundingClientRect();
          const within = box => box.left >= figure.left && box.right <= figure.right && box.top >= figure.top && box.bottom < figure.bottom;
          const separate = phone.right <= details.left || details.right <= phone.left || phone.bottom <= details.top || details.bottom <= phone.top;
          return { fits: within(phone) && within(details) && separate, sideBySide: details.left >= phone.right, tabsAbove: details.bottom <= phone.top, height: figure.height, overflow: el.closest('[data-theme]').scrollWidth > innerWidth + 1 };
        });
        assert(bounds.fits && !bounds.overflow, `${width}/${theme}: phone, calendar and controls fit`);
        if (width >= 768) {
          assert(bounds.sideBySide, 'Features sit to the right within the graphic');
          assert(bounds.height <= 600, 'Graphic and all three features fit together in a compact panel');
        } else {
          assert(bounds.tabsAbove, 'Mobile feature controls sit above the preview');
          assert(bounds.height <= 700, 'Mobile section avoids the long stack of feature descriptions');
          assert.equal(await section.getByRole('tablist').getAttribute('aria-orientation'), 'horizontal');
          for (const tab of await section.getByRole('tab').all()) assert((await tab.boundingBox()).height >= 44, 'Feature tabs have comfortable touch targets');
        }
        assert.equal(await section.locator('[data-day-booking]').count(), 3);
        assert.equal(await section.locator('[data-day-calendar]').getByText('Saturday, 17 October', { exact: true }).count(), 1, 'Backdrop shows one day');
        assert.equal(await section.locator('[data-day-calendar]').getByText('9 am', { exact: true }).count(), 1, 'Day timeline shows hourly slots');
        assert.equal(await section.getByRole('tab').count(), 3);
        const options = [
          ['calendar', 'Working hours & calendar'],
          ['policies', 'Deposits & consent forms'],
          ['appointment', 'Add appointments on the go'],
        ];
        assert.equal(await section.getByRole('tab', { selected: true }).getAttribute('id'), 'artist-day-calendar', 'Calendar selected by default');
        const before = await phone.boundingBox();
        for (const [screen, title] of options) {
          await section.getByRole('tab', { name: title, exact: true }).click();
          assert.equal(await section.getByRole('tab', { selected: true }).count(), 1);
          assert.equal(await phone.getAttribute('data-app-preview'), screen);
          const current = phone.locator(`[data-day-screen="${screen}"] ${screen !== 'calendar' ? '[data-preview-frame][data-active="true"] ' : ''}[data-native-theme="${theme}"]`);
          await current.evaluate(el => el.decode());
          assert.equal(await current.evaluate(el => el.naturalWidth), 1206, 'Selected native screen loads in the chosen theme');
          assert.equal(await phone.locator('[data-day-screen]:not([hidden])').getAttribute('data-day-screen'), screen);
          const after = await phone.boundingBox();
          assert(Math.abs(before.width - after.width) < 1 && Math.abs(before.height - after.height) < 1, 'Switching screens preserves phone dimensions');
          if (width < 768) {
            const panel = section.getByRole('tabpanel');
            const summary = section.locator('#artist-day-summary');
            assert(await summary.isVisible(), 'Mobile selection has a visible summary');
            assert.equal(await panel.getAttribute('aria-describedby'), 'artist-day-summary');
            if (screen !== 'calendar') {
              for (const control of await panel.getByRole('button').all()) {
                const rect = await control.boundingBox();
                assert(rect.width >= 44 && rect.height >= 44, 'Preview controls support touch input');
              }
            }
          }
          if (screen === 'policies') {
            for (const [index, name] of ['Preview deposit confirmation', 'Preview consent form'].entries()) {
              await section.getByRole('button', { name, exact: true }).click();
              const step = phone.locator(`[data-policy-step="${index}"]`);
              assert.equal(await step.getAttribute('data-active'), 'true');
              const image = step.locator(`[data-native-theme="${theme}"]`);
              await image.evaluate(el => el.decode());
              assert.equal(await image.evaluate(el => el.naturalWidth), 1206, 'Client deposit and consent captures load in every theme');
              assert.equal(await step.evaluate(el => getComputedStyle(el).opacity), '1', 'Reduced motion switches instantly');
              assert(!(await image.getAttribute('src')).includes('/policies-'), 'Settings form is replaced');
              if (width === 390 || width === 1440) await page.screenshot({ path: path.join(output, `client-${index === 0 ? 'deposit' : 'consent'}-${theme}-${width}.png`) });
            }
            const controls = section.getByRole('group', { name: 'Deposit and consent preview screens' });
            assert(await controls.evaluate(el => { const r = el.getBoundingClientRect(); const f = el.closest('figure').getBoundingClientRect(); return r.left >= f.left && r.right <= f.right && r.bottom < f.bottom; }), 'Deposit controls fit within the graphic');
          }
          if (screen === 'appointment') {
            for (const [index, label] of ['Client', 'Details', 'Date & time'].entries()) {
              await section.getByRole('button', { name: `Preview step ${index + 1}: ${label}`, exact: true }).click();
              const step = phone.locator(`[data-appointment-step="${index}"]`);
              assert.equal(await step.getAttribute('data-active'), 'true');
              const image = step.locator(`[data-native-theme="${theme}"]`);
              await image.evaluate(el => el.decode());
              assert.equal(await image.evaluate(el => el.naturalWidth), 1206, 'Each appointment step has a native capture in every theme');
              assert.equal(await step.evaluate(el => getComputedStyle(el).opacity), '1', 'Reduced motion switches instantly');
            }
            const controls = section.getByRole('group', { name: 'New appointment preview steps' });
            assert(await controls.evaluate(el => { const r = el.getBoundingClientRect(); const f = el.closest('figure').getBoundingClientRect(); return r.left >= f.left && r.right <= f.right && r.bottom < f.bottom; }), 'Step controls fit within the graphic');
          }
          if (theme === 'dark' && (width === 390 || width === 1440)) {
            await section.scrollIntoViewIfNeeded();
            await page.screenshot({ path: path.join(output, `selected-${screen}-${width}.png`) });
          }
        }
        const last = section.getByRole('tab', { name: 'Add appointments on the go', exact: true });
        await last.focus(); await page.keyboard.press('Home');
        assert.equal(await section.getByRole('tab', { selected: true }).getAttribute('id'), 'artist-day-calendar');
        await page.keyboard.press(width < 768 ? 'ArrowRight' : 'ArrowDown');
        assert.equal(await phone.getAttribute('data-app-preview'), 'policies', 'Arrow key switches and focuses the policy preview');
        assert.equal(await section.getByRole('tab', { selected: true }).evaluate(el => el === document.activeElement), true);
        await page.keyboard.press('End');
        assert.equal(await phone.getAttribute('data-app-preview'), 'appointment');
        await page.keyboard.press('ArrowDown');
        assert.equal(await phone.getAttribute('data-app-preview'), 'calendar', 'Keyboard navigation wraps to the first option');
        assert.equal(await section.getByRole('tabpanel').getAttribute('aria-labelledby'), 'artist-day-calendar');
        if (width === 1440 || width === 390) {
          await page.addStyleTag({ content: 'html,body{height:auto!important;overflow:visible!important}[data-theme]{height:auto!important;overflow:visible!important}[class*="artists_navigation"]{position:relative!important}[class*="artists_skipLink"]{visibility:hidden!important}' });
          await section.screenshot({ path: path.join(output, `${theme}-${width}.png`) });
        }
      }
      await section.evaluate(el => {
        const nodes = [...el.querySelectorAll('h2, [role="tab"] > span, #artist-day-summary')];
        const sizes = nodes.map(node => getComputedStyle(node).fontSize);
        nodes.forEach((node, i) => node.style.fontSize = parseFloat(sizes[i]) * 1.5 + 'px');
      });
      assert(await section.evaluate(el => el.closest('[data-theme]').scrollWidth <= innerWidth + 1), '150% text fits');
      if (width < 768) assert(await section.locator('[class*="dayOptionMobileLabel"]').evaluateAll(labels => labels.every(label => {
        const text = label.getBoundingClientRect(), button = label.closest('button').getBoundingClientRect();
        return text.left >= button.left && text.right <= button.right && label.scrollWidth <= label.clientWidth + 1;
      })), 'Larger mobile tab labels wrap inside their touch targets');
      assert.deepEqual(errors, []);
      console.log(`PASS ${width}: four native theme captures, sample bookings, responsive composition and 150% text`);
      await page.close();
    }
    for (const width of [390, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: 'no-preference' });
      await instrument(page); await page.goto(base + '/artists/');
      await page.getByRole('button', { name: /^Change theme/ }).waitFor();
      const phone = page.locator('#your-day [data-app-preview]');
      assert.equal(await phone.evaluate(el => getComputedStyle(el).opacity), '0', 'Phone waits for its scene without blinking');
      await page.locator('#your-day').evaluate(el => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
      await page.waitForFunction(() => window.dayEffects.some(e => e.part === 'phone'));
      const effects = await page.evaluate(() => window.dayEffects);
      const lines = effects.filter(e => e.part === 'headline'), calendar = effects.find(e => e.part === 'calendar'), preview = effects.find(e => e.part === 'phone');
      assert.equal(lines.length, 2);
      assert(lines[0].starts < lines[1].starts, 'Headline lines enter in order');
      assert(calendar.starts >= lines[1].starts + lines[1].duration - 5, 'Calendar follows the headline');
      assert(preview.starts > calendar.starts + 700, 'Phone follows the calendar and first sample bookings');
      await page.waitForFunction(() => document.querySelector('[data-artist-reveal="day-scene"]').dataset.revealState === 'complete');
      assert.equal(await phone.evaluate(el => getComputedStyle(el).opacity), '1');
      assert.equal(await page.locator('#your-day').evaluate(el => el.getAnimations({ subtree: true }).length), 0, 'Finished scene releases animations');
      await page.locator('[data-theme]').evaluate(el => el.scrollTo({ top: 0, behavior: 'instant' }));
      await page.locator('#your-day').scrollIntoViewIfNeeded();
      await page.waitForTimeout(100);
      assert.equal(await page.evaluate(() => window.dayEffects.filter(e => e.part !== 'other').length), effects.filter(e => e.part !== 'other').length, 'Returning never replays the sequence');
      fs.writeFileSync(path.join(output, `sequence-${width}.json`), JSON.stringify(effects, null, 2));
      console.log(`PASS ${width}: headline → calendar → sample bookings → phone, no replay or retained motion`);
      await page.close();
    }
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'no-preference' });
    await page.goto(base + '/artists/');
    await page.getByRole('button', { name: /^Change theme/ }).waitFor();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    // The media-query change is delivered on the next browser rendering update.
    await page.waitForFunction(() => [...document.querySelectorAll('#your-day [data-day-line], #your-day [data-app-preview]')].every(el => getComputedStyle(el).opacity === '1'), null, { timeout: 1000 });
    console.log('PASS reduced-motion change: pending headline and phone remain available');
    await page.close();
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
