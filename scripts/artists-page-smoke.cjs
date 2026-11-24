// The artist page: gallery style, the questionnaire that collects nothing, the rules sentence and the link field.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.STUDIO_PLAYWRIGHT_PATH || 'playwright');
const base = process.env.PUBLIC_TEST_URL || 'http://localhost:4174';
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

(async () => {
  const browser = await chromium.launch({ executablePath: executablePath || undefined });
  try {
    for (const width of [1440, 768, 390, 320]) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, hasTouch: width < 500, isMobile: width < 500 });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.addInitScript(() => sessionStorage.setItem('vanta-intro-seen', 'true'));
      assert.equal((await page.goto(base + '/artists/')).status(), 200);
      await page.getByRole('heading', { level: 1, name: /Show your work\. Get booked\. Vanta runs the rest\./ }).waitFor();
      const main = page.locator('main');
      assert.equal(await main.evaluate(el => el.scrollWidth <= el.clientWidth + 1), true, `no sideways scroll at ${width}`);

      // The questionnaire: answering sends and stores nothing
      const requests = [];
      page.on('request', request => { if (!/\.(js|css|webp|png|jpg|woff2)(\?|$)/.test(request.url())) requests.push(request.url()); });
      const rules = page.locator('#your-rules');
      await rules.scrollIntoViewIfNeeded();
      await rules.getByRole('heading', { name: 'Do you have a fixed rate, or do you quote each piece?' }).waitFor();
      await rules.getByRole('button', { name: /I quote each piece/ }).click();
      await rules.getByRole('heading', { name: 'Do you want clients to book a slot straight away?' }).waitFor();
      await rules.getByRole('button', { name: '← Back' }).click();
      await rules.getByRole('button', { name: /I quote each piece/ }).click();
      await rules.getByRole('button', { name: /They tell me when they’re free/ }).click();
      assert.equal(await rules.getByLabel('Pricing').inputValue(), 'quote');
      assert.equal(await rules.getByLabel('Deposit', { exact: true }).inputValue(), '50', 'deposit starts at $50');
      await rules.getByLabel('Deposit', { exact: true }).selectOption('100');
      assert.equal(await rules.getByLabel('Deposit refund').inputValue(), 'never', 'deposit never refunded by default');
      await rules.getByLabel('Cancel and reschedule notice').selectOption('168');
      assert.equal(await rules.getByLabel('How clients pick a time').inputValue(), 'avail');
      assert.equal(await rules.getByLabel('Deposit', { exact: true }).inputValue(), '100');
      assert.match(await rules.locator('figure').textContent(), /When are you free\?.*Reference photos.*Cancel or move your booking up to 7 days before\. The deposit isn’t refunded/s);
      await rules.getByLabel('How clients pick a time').selectOption('instant');
      assert.match(await rules.locator('figure').textContent(), /Pick a time.*Pay \$100 and book/s);
      await rules.getByRole('button', { name: 'Start again' }).click();
      await rules.getByRole('button', { name: 'Skip to the result →' }).click();
      assert.equal(await rules.getByLabel('Deposit refund').inputValue(), 'never');
      assert.deepEqual(requests, [], 'the questionnaire makes no requests');
      assert.equal(await page.evaluate(() => localStorage.length), 0, 'nothing kept in the browser');

      // The booking form builder: switching a question changes the form clients see
      const form = page.locator('#your-form');
      await form.scrollIntoViewIfNeeded();
      const preview = form.getByRole('figure');
      assert.doesNotMatch(await preview.textContent(), /Allergies/);
      await form.getByRole('radiogroup', { name: 'Allergies' }).getByRole('radio', { name: 'Optional' }).click();
      assert.match(await preview.textContent(), /AllergiesOptional/);
      await form.getByRole('radiogroup', { name: 'Reference photos' }).getByRole('radio', { name: 'Off' }).click();
      assert.equal(await preview.locator('img').count(), 1, 'only the artist photo once reference photos are off');

      // Vanta Pro: each perk lights up its notifications on the client's lock screen
      const pro = page.locator('#vanta-pro');
      await pro.scrollIntoViewIfNeeded();
      await pro.getByRole('button', { name: /Emails from your own inbox/ }).click();
      assert.equal(await pro.locator('[data-on=true]').count(), 2, 'the two emails light up');
      await pro.getByRole('button', { name: /Your own booking address/ }).click();
      assert.match(await pro.locator('[data-on=true]').textContent(), /mia\.vanta\.tattoo/);
      assert.doesNotMatch(await pro.getByRole('figure').textContent(), /mia\.vanta\.tattoo/, 'the address is not in texts or emails');
      assert.match(await pro.textContent(), /A\$9\.99/);

      assert.equal(await page.getByRole('link', { name: 'Download Vanta on the App Store' }).first().getAttribute('href'), 'https://apps.apple.com/au/app/vanta-find-your-next-tattoo/id6760996738');
      assert.deepEqual(errors, []);
      console.log(`PASS ${width}: artist page, questionnaire (no data), rules sentence, form builder, Vanta Pro`);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
