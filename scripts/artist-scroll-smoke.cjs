// Public artist page: scroll-driven booking emphasis and directional navigation.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.STUDIO_PLAYWRIGHT_PATH || 'playwright');
const base = process.env.PUBLIC_TEST_URL || 'http://127.0.0.1:3048';
const output = process.env.ARTIST_REVIEW_OUTPUT || '/private/tmp/vanta-artist-scroll-review';
(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH });
  try {
    for (const [width, height] of [[320,740],[390,844],[768,900],[1440,900],[1440,600]]) {
      const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.goto(base + '/artists/');
      const root = page.locator('[data-theme]');
      const header = page.locator('[data-artist-header]');
      const track = page.locator('[data-booking-scroll]');
      await page.locator('[data-booking-scroll][data-scroll-ready="true"]').waitFor();
      if (width <= 760) {
        await page.locator('[data-booking-scroll][data-mobile-step="1"][data-active-step="1"]').waitFor();
        assert.equal(await page.getByRole('tablist', { name: 'Booking steps' }).getAttribute('aria-orientation'), 'horizontal');
        for (const tab of await page.getByRole('tablist', { name: 'Booking steps' }).getByRole('tab').all()) assert((await tab.boundingBox()).height >= 44, 'Mobile steps have touch-sized controls');
      } else assert.equal(await track.getAttribute('data-active-step'), '0', 'No highlight before panels reach the centre');
      assert.equal(await track.locator('figcaption').count(), 0, 'No captions below screenshots');
      async function scroll(top) {
        await root.evaluate((el, top) => el.scrollTo({ top, behavior: 'instant' }), top);
        await page.waitForTimeout(45);
      }
      await scroll(400);
      assert.equal(await header.getAttribute('data-header-hidden'), 'true', 'Down scroll hides header');
      assert((await header.boundingBox()).y < -60, 'Header leaves viewport');
      await scroll(380);
      assert.equal(await header.getAttribute('data-header-hidden'), 'true', 'Small upward movement does not summon header');
      await scroll(340);
      assert.equal(await header.getAttribute('data-header-hidden'), 'false', 'Up scroll shows header');
      await scroll(342); await scroll(340);
      assert.equal(await header.getAttribute('data-header-hidden'), 'false', 'Small jitter leaves header visible');
      await page.getByRole('button', { name: /^Change theme/ }).click();
      await scroll(650);
      assert.equal(await header.getAttribute('data-header-hidden'), 'false', 'Open menu keeps header visible');
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: /^Change theme/ }).evaluate(el => el.blur());
      await scroll(800);
      assert.equal(await header.getAttribute('data-header-hidden'), 'true');
      await page.getByRole('button', { name: /^Change theme/ }).focus();
      assert.equal(await header.getAttribute('data-header-hidden'), 'false', 'Keyboard focus restores header');
      await page.getByRole('button', { name: /^Change theme/ }).evaluate(el => el.blur());
      const pinned = await track.getAttribute('data-scroll-pinned') === 'true';
      assert.equal(pinned, width > 760 && height >= 740, 'Pin only on screens with room');
      if (pinned) {
        const centreStart = await track.evaluate(el => {
          const root = el.closest('[data-theme]');
          return root.scrollTop + el.getBoundingClientRect().top - parseFloat(el.style.getPropertyValue('--booking-centre-top'));
        });
        await scroll(centreStart - 24);
        assert.equal(await track.getAttribute('data-active-step'), '0', 'Sequence waits until panels reach centre');
        await scroll(centreStart + 4);
        assert.equal(await track.getAttribute('data-active-step'), '1', 'Sequence starts in centre');
        const stageBox = await track.locator(':scope > div').boundingBox();
        assert(Math.abs(stageBox.y + stageBox.height / 2 - height / 2) < 2, 'Panels are vertically centred at start');
      }
      async function stepPosition(index, progress) {
        return track.evaluate((el, { index, width, progress }) => {
          const root = el.closest('[data-theme]');
          const top = root.scrollTop + el.getBoundingClientRect().top;
          const stage = el.firstElementChild;
          const p = progress ?? (index + .5) / 3;
          if (el.dataset.scrollPinned === 'true') return top - parseFloat(el.style.getPropertyValue('--booking-centre-top')) + (el.offsetHeight - stage.offsetHeight) * p;
          if (width > 760) return top - (root.clientHeight - stage.offsetHeight) / 2 + el.offsetHeight * .7 * p;
          const step = el.querySelectorAll('[data-booking-step]')[index].getBoundingClientRect();
          return root.scrollTop + step.top + step.height / 2 - root.clientHeight * .5 + 2;
        }, { index, width, progress });
      }
      for (const i of [0,1,2,1,0]) {
        if (width <= 760) {
          await page.getByRole('tablist', { name: 'Booking steps' }).getByRole('tab').nth(i).click();
          await page.waitForFunction(index => document.querySelector('[data-booking-scroll]').dataset.activeStep === String(index + 1), i);
          assert.equal(await track.getByRole('tabpanel').count(), 1, 'Only the selected booking preview is exposed');
          const panel = track.getByRole('tabpanel');
          assert.equal(await panel.getAttribute('data-booking-step'), String(i + 1));
          assert((await panel.locator('[data-app-preview]').boundingBox()).width >= 176, 'Mobile preview is larger than the old side-by-side thumbnails');
          await panel.scrollIntoViewIfNeeded();
        } else await scroll(await stepPosition(i));
        assert.equal(await track.getAttribute('data-active-step'), String(i + 1), 'Emphasis follows the selected mobile step or desktop scroll');
        assert.equal(await track.locator('[data-step-active="true"]').count(), 1);
        assert.equal(await track.locator('[aria-current="step"]').getAttribute('data-booking-step'), String(i + 1));
        if (width > 760) {
          const tops = await track.locator('[data-app-preview]').evaluateAll(nodes => nodes.map(el => el.getBoundingClientRect().top));
          assert(Math.max(...tops) - Math.min(...tops) < 1, 'All screenshot tops stay aligned');
          const line = await track.evaluate((el, index) => {
            const stage = el.firstElementChild;
            const fill = getComputedStyle(stage, '::after');
            const matrix = new DOMMatrixReadOnly(fill.transform);
            const circle = stage.querySelectorAll('[data-booking-step]')[index].querySelector('span').getBoundingClientRect();
            return {
              end: parseFloat(fill.left) + parseFloat(fill.width) * matrix.a,
              expected: circle.left + circle.width / 2 - stage.getBoundingClientRect().left,
            };
          }, i);
          assert(Math.abs(line.end - line.expected) < 1, 'Progress pauses at each numbered circle, including step 03');
        }
        if (i === 1) await page.screenshot({ path: path.join(output, `step-2-${width}-${height}.png`) });
        if (i === 2) await page.screenshot({ path: path.join(output, `step-3-${width}-${height}.png`) });
      }
      if (width <= 760) {
        const tabs = page.getByRole('tablist', { name: 'Booking steps' }).getByRole('tab');
        await tabs.first().focus(); await page.keyboard.press('ArrowRight');
        assert.equal(await tabs.nth(1).getAttribute('aria-selected'), 'true');
        assert(await tabs.nth(1).evaluate(el => el === document.activeElement));
        await page.keyboard.press('End');
        assert.equal(await track.getByRole('tabpanel').getAttribute('data-booking-step'), '3');
        await page.keyboard.press('ArrowRight');
        assert.equal(await track.getByRole('tabpanel').getAttribute('data-booking-step'), '1');
      }
      if (width > 760) {
        const markers = await track.evaluate(el => {
          const stage = el.firstElementChild, box = stage.getBoundingClientRect();
          const rail = getComputedStyle(stage, '::before');
          return {
            positions: [...stage.querySelectorAll('[data-booking-step]')].map(step => {
              const marker = step.firstElementChild.getBoundingClientRect();
              return marker.left + marker.width / 2 - box.left;
            }),
            expected: [parseFloat(rail.left), box.width / 2, box.width - parseFloat(rail.right)],
            labels: [...stage.querySelectorAll('[data-booking-step]')].map(step => step.firstElementChild.textContent),
          };
        });
        assert.deepEqual(markers.labels, ['01','02','03']);
        assert(markers.positions.every((position, i) => Math.abs(position - markers.expected[i]) < 1), '01, 02 and 03 sit at the left end, centre and right end of the rail');
        await scroll(await stepPosition(2));
        assert.equal(await track.evaluate(el => Number(el.firstElementChild.style.getPropertyValue('--booking-progress'))), 1, 'Reaching marker 03 completes the line at its right endpoint');
      }
      for (const theme of ['dark','light','nature','space']) {
        await page.getByRole('button', { name: /^Change theme/ }).focus();
        await page.getByRole('button', { name: /^Change theme/ }).click();
        await page.getByRole('radio', { name: theme, exact: false }).click(); await page.keyboard.press('Escape');
        const current = Number(await track.getAttribute('data-active-step'));
        assert.equal(await track.locator('[data-step-active="true"]').count(), current > 0 ? 1 : 0);
      }
      assert(await root.evaluate(el => el.scrollWidth <= el.clientWidth + 1));
      await page.getByRole('button', { name: /^Change theme/ }).evaluate(el => el.blur());
      await scroll(0);
      assert.equal(await header.getAttribute('data-header-hidden'), 'false', 'Header visible at top');
      assert.deepEqual(errors, []);
      console.log(`PASS ${width}x${height}: directional header, jitter, menu/focus access, three highlights in both directions, themes and no overflow`);
      await page.close();
    }
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });
    await page.goto(base + '/artists/');
    await page.locator('[data-booking-scroll][data-scroll-ready="true"]').waitFor();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(() => document.querySelector('[data-booking-scroll]').dataset.scrollPinned === 'false');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForFunction(() => document.querySelector('[data-booking-scroll]').dataset.scrollPinned === 'true');
    await page.locator('[data-theme]').evaluate(el => el.scrollTo({ top: 600, behavior: 'instant' }));
    await page.waitForTimeout(300);
    assert((await page.locator('[data-artist-header]').boundingBox()).y < -60);
    assert.equal(await page.getByRole('tablist', { name: 'Booking steps' }).count(), 0, 'Mobile controls are hidden after resizing back to desktop');
    console.log('PASS resize switches pinned desktop to compact mobile layout; animated header hides');
    await page.close();
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    const staticPage = await context.newPage(); await staticPage.goto(base + '/artists/');
    assert.equal(await staticPage.locator('[data-booking-step]').count(), 3);
    assert.equal(await staticPage.locator('[data-booking-step]:visible').count(), 3);
    assert.equal(await staticPage.locator('[data-booking-scroll]').getAttribute('data-scroll-ready'), null);
    console.log('PASS no JavaScript: three readable panels and visible navigation');
    await context.close();
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
