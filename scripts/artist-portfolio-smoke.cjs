// Section 01: focused product composition, responsive navigation and theme consistency.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.STUDIO_PLAYWRIGHT_PATH || 'playwright');
const base = process.env.PUBLIC_TEST_URL || 'http://127.0.0.1:3048';
const output = process.env.ARTIST_REVIEW_OUTPUT || '/private/tmp/vanta-portfolio-product-review';
const captureStyles = 'html,body{height:auto!important;overflow:visible!important}[data-theme]{height:auto!important;overflow:visible!important}[class*="artists_navigation"]{position:relative!important}[class*="artists_skipLink"]{visibility:hidden!important}';
(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH });
  const results = [];
  try {
    for (const width of [320, 390, 600, 768, 1000, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(base + '/artists/');
      const section = page.locator('#your-work[data-portfolio-enhanced="true"]');
      await section.waitFor();
      const sources = await section.locator('img:not([data-native-screenshot])').evaluateAll(imgs => imgs.map(img => img.getAttribute('src')));
      for (const theme of ['dark', 'light', 'nature', 'space']) {
        await page.locator('[data-theme]').evaluate(el => el.scrollTo({ top: 0, behavior: 'instant' }));
        await page.getByRole('button', { name: /^Change theme/ }).click();
        await page.getByRole('radio', { name: new RegExp(`^${theme}$`, 'i') }).click();
        await page.keyboard.press('Escape');
        await section.scrollIntoViewIfNeeded();
        await section.locator('img:visible').evaluateAll(imgs => Promise.all(imgs.map(img => img.decode())));
        assert.deepEqual(await section.locator('img:not([data-native-screenshot])').evaluateAll(imgs => imgs.map(img => img.getAttribute('src'))), sources, 'Themes preserve original tattoo photography');
        assert(await section.locator('img:visible').evaluateAll(imgs => imgs.every(img => img.naturalWidth > 0 && getComputedStyle(img).filter === 'none' && (img.closest('[role="img"][aria-label]') || img.closest('[aria-hidden="true"]')))), 'App artwork loads with accessible preview labels and remains unfiltered');
        {
          const tabs = section.getByRole('tablist', { name: 'Portfolio preview' }).getByRole('tab');
          assert.equal(await tabs.count(), 2);
          for (const tab of await tabs.all()) assert((await tab.boundingBox()).height >= 44, 'Preview tabs support touch input');
          for (const [index, view] of ['feed', 'portfolio'].entries()) {
            await tabs.nth(index).click();
            const panel = section.getByRole('tabpanel');
            assert.equal(await panel.count(), 1, 'Exposes one primary preview');
            assert.equal(await panel.getAttribute('aria-labelledby'), await tabs.nth(index).getAttribute('id'));
            const screens = view === 'feed' ? ['feed', 'discovery'] : ['portfolio'];
            for (const [screenIndex, screen] of screens.entries()) {
              if (view === 'feed') {
                const controls = panel.getByRole('group', { name: 'Explore preview' }).getByRole('button');
                assert.equal(await controls.count(), 2, 'Feed and tattoo details are combined in Explore');
                await controls.nth(screenIndex).click();
                assert.equal(await controls.nth(screenIndex).getAttribute('aria-pressed'), 'true');
              }
              await panel.locator('img:visible').evaluateAll(imgs => Promise.all(imgs.map(img => img.decode())));
              const capture = panel.locator('[data-native-capture]:visible');
              assert.equal(await capture.count(), 1, 'Shows one focused native screen');
              assert.equal(await capture.getAttribute('data-app-preview'), screen);
              assert.equal(await capture.getAttribute('data-capture-theme'), theme, 'App capture follows the page theme');
              assert.equal(await capture.locator('img').getAttribute('src'), `/studio/artist/${screen}-${theme}-780.webp`);
              assert(await capture.locator('img').evaluate(img => Math.abs(img.clientWidth / img.clientHeight - img.naturalWidth / img.naturalHeight) < .005), 'Original capture proportions stay intact');
              assert.equal(await capture.locator('[class*="statusBar"], [class*="appNav"], [class*="tattooGrid"]').count(), 0, 'No recreated app UI overlays the capture');
              assert((await capture.boundingBox()).width >= 196, 'App content stays large');
              if (width === 320 || width === 390) {
                const style = await page.addStyleTag({ content: captureStyles });
                await section.screenshot({ path: path.join(output, `${theme}-${width}-${screen}.png`) });
                await style.evaluate(el => el.remove());
              }
            }
            if (view === 'feed') await panel.getByRole('button', { name: 'Feed', exact: true }).click();
          }
          await tabs.first().focus();
          await page.keyboard.press('ArrowRight');
          assert.equal(await tabs.nth(1).getAttribute('aria-selected'), 'true');
          assert(await tabs.nth(1).evaluate(el => el === document.activeElement), 'Arrow keys move selection and focus');
          await page.keyboard.press('Home');
          assert.equal(await tabs.first().getAttribute('aria-selected'), 'true');
          await page.keyboard.press('End');
          assert.equal(await tabs.nth(1).getAttribute('aria-selected'), 'true');
          await page.keyboard.press('ArrowRight');
          assert.equal(await tabs.first().getAttribute('aria-selected'), 'true', 'Keyboard selection wraps');
          await page.keyboard.press('ArrowLeft');
          assert.equal(await tabs.last().getAttribute('aria-selected'), 'true', 'Backward selection wraps across both primary previews');
          await page.keyboard.press('Home');
          assert.equal(await section.getByRole('tablist').getAttribute('aria-orientation'), width <= 760 ? 'horizontal' : 'vertical');
          if (width === 768 || width === 1440) {
            const style = await page.addStyleTag({ content: captureStyles });
            await section.screenshot({ path: path.join(output, `${theme}-${width}-portfolio.png`) });
            await style.evaluate(el => el.remove());
          }
        }
        const geometry = await section.evaluate(el => {
          const scene = el.querySelector('[data-portfolio-showcase]').getBoundingClientRect();
          const root = el.closest('[data-theme]');
          const phones = [...el.querySelectorAll('[data-app-preview]')].filter(node => node.getClientRects().length).map(node => node.getBoundingClientRect());
          return { fits: phones.every(box => box.left >= scene.left && box.right <= scene.right && box.top >= scene.top && box.bottom <= scene.bottom + 1), overflow: root.scrollWidth > root.clientWidth + 1 };
        });
        assert(geometry.fits && !geometry.overflow, `${width}/${theme}: screenshots stay within the composition`);
        results.push({ width, theme, ...geometry });
      }
      if (width === 320) {
        await section.evaluate(el => {
          for (const node of el.querySelectorAll('h2, h3, p, button')) node.style.fontSize = `${parseFloat(getComputedStyle(node).fontSize) * 1.5}px`;
        });
        assert(await section.evaluate(el => [...el.querySelectorAll('h2, h3, p, button')].filter(node => node.getClientRects().length).every(node => node.scrollWidth <= node.clientWidth + 1)), '150% text fits the narrow layout');
        assert(await page.locator('[data-theme]').evaluate(el => el.scrollWidth <= el.clientWidth + 1), 'Larger text does not cause page overflow');
        await page.addStyleTag({ content: captureStyles });
        await section.screenshot({ path: path.join(output, 'large-text-320-portfolio.png') });
      }
      assert.deepEqual(errors, [], 'No browser errors');
      console.log(`PASS ${width}: themes, previews, keyboard and overflow`);
      await page.close();
    }
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    await page.goto(base + '/artists/');
    await page.locator('#your-work [role="tablist"]').waitFor();
    await page.locator('#your-work').getByRole('tab', { name: 'Explore the feed' }).click();
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForFunction(() => document.querySelector('#your-work [role="tablist"]').getAttribute('aria-orientation') === 'vertical');
    assert.equal(await page.locator('#your-work [data-app-preview]:visible').count(), 1, 'Resizing preserves one focused preview');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('#your-work').getByRole('tabpanel').waitFor();
    assert.equal(await page.locator('#your-work').getByRole('tabpanel').locator('[data-app-preview]:visible').getAttribute('data-app-preview'), 'feed', 'Resize preserves mobile selection');
    await page.close();
    const staticPage = await browser.newPage({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false });
    await staticPage.goto(base + '/artists/');
    assert.equal(await staticPage.locator('#your-work [data-app-preview]:visible').count(), 3, 'All app screens are available without JavaScript');
    assert.equal(await staticPage.locator('#your-work').getByRole('button').count(), 0, 'No inactive scripted controls without JavaScript');
    await staticPage.close();
    fs.writeFileSync(path.join(output, 'summary.json'), JSON.stringify({ cases: results, responsiveSelection: true, noJavaScriptPreviews: true }, null, 2));
    console.log(`Passed ${results.length} portfolio viewport/theme checks, preview navigation, 150% text, responsive selection and no-JavaScript previews.`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
