// Every account/API request is blocked; this only exercises public page navigation.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium, request: createRequest } = require(process.env.STUDIO_PLAYWRIGHT_PATH || 'playwright');

const base = process.env.PUBLIC_TEST_URL || 'http://127.0.0.1:3060';
const output = process.env.PUBLIC_TEST_OUTPUT || '/private/tmp/vanta-studio-html-navigation';
const origin = new URL(base).origin;

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined });
  const results = [];
  try {
    for (const width of [390, 1440]) {
      for (const mode of ['normal', 'failed-data', 'older-release']) {
        for (const from of ['/', '/artists', '/pricing']) {
          const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
          const page = await context.newPage();
          const documents = [], dataRequests = [], errors = [];
          page.setDefaultTimeout(15000);
          page.on('pageerror', error => errors.push(error.message));
          page.on('request', request => {
            if (request.isNavigationRequest()) documents.push(new URL(request.url()).pathname);
          });
          await context.route('**/*', async route => {
            const request = route.request(), url = new URL(request.url());
            if (request.method() !== 'GET' || url.origin !== origin) return route.fulfill({ status: 204 });
            if (url.pathname === '/studio.txt' || url.pathname === '/studio/index.txt') {
              dataRequests.push(url.pathname);
              assert.notEqual(request.resourceType(), 'document', 'Page data must never become the visible document');
              if (mode === 'failed-data') return route.abort('failed');
              if (mode === 'older-release') {
                const response = await route.fetch();
                return route.fulfill({ response, body: (await response.text()).replace(/"b":"[^"]+"/, '"b":"older-cached-release"') });
              }
            }
            return route.continue();
          });
          await page.goto(`${base}${from}`, { waitUntil: 'networkidle' });
          await page.getByRole('link', { name: 'For studios', exact: true }).first().click();
          await page.waitForURL(`${base}/studio`);
          await page.getByRole('heading', { name: 'From the first hello to the final detail.' }).waitFor();
          assert.equal(await page.evaluate(() => document.contentType), 'text/html');
          assert.equal(documents.at(-1), '/studio', 'The browser must load the actual HTML page');
          assert.deepEqual(dataRequests, [], 'Public navigation must not depend on the .txt page-data fetch');
          assert.deepEqual(errors, []);
          if (mode === 'failed-data' && from === '/') await page.screenshot({ path: `${output}/studio-${width}.png` });
          results.push(`PASS ${width}px ${mode}: ${from} → /studio loads HTML`);
          await context.close();
        }
      }
    }

    const page = await browser.newPage({ reducedMotion: 'reduce' });
    await page.route('**/*', route => route.request().method() === 'GET' && new URL(route.request().url()).origin === origin ? route.continue() : route.fulfill({ status: 204 }));
    page.setDefaultTimeout(15000);
    for (const path of ['/studio', '/studio/', '/studio.html', '/studios/']) {
      await page.goto(`${base}${path}`, { waitUntil: 'networkidle' });
      await page.getByRole('heading', { name: 'From the first hello to the final detail.' }).waitFor();
      assert.equal(await page.evaluate(() => document.contentType), 'text/html');
      assert(!new URL(page.url()).pathname.endsWith('.txt'));
      results.push(`PASS direct ${path}: HTML and studio content`);
    }
    for (const path of ['/studio', '/studio/', '/studio.html']) {
      await page.goto(`${base}${path}`);
      await page.getByRole('heading', { name: 'From the first hello to the final detail.' }).waitFor();
      await page.reload();
      await page.getByRole('heading', { name: 'From the first hello to the final detail.' }).waitFor();
      assert.equal(await page.evaluate(() => document.contentType), 'text/html');
    }
    await page.goto(`${base}/`);
    await page.getByRole('navigation', { name: 'For tattoo professionals' }).getByRole('link', { name: 'Vanta Studio' }).click();
    await page.waitForURL(`${base}/studio`);
    await page.goBack();
    await page.waitForURL(`${base}/`);
    await page.goForward();
    await page.waitForURL(`${base}/studio`);
    assert.equal(await page.evaluate(() => document.contentType), 'text/html');
    results.push('PASS reload, footer link, browser Back and Forward preserve HTML navigation');
    await page.close();

    const request = await createRequest.newContext();
    try {
      for (const path of ['/studio/index.txt', '/artists/index.txt', '/pricing/index.txt']) {
        const response = await request.get(`${base}${path}`);
        assert.equal(response.status(), 200, `Trailing-slash route data exists: ${path}`);
        assert((await response.text()).includes('"b":'), `The file contains Next navigation data: ${path}`);
      }
    } finally { await request.dispose(); }
    results.push('PASS trailing-slash route data is available');
    console.log(results.join('\n'));
    fs.writeFileSync(`${output}/results.json`, JSON.stringify(results, null, 2) + '\n');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
