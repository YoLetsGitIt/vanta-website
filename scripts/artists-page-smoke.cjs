// The artist page: gallery style, the questionnaire that collects nothing, the rules sentence and the link field.
// Wider screens get the desktop page; phones (720px and narrower) get their own screens, tested below.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.STUDIO_PLAYWRIGHT_PATH || 'playwright');
const base = process.env.PUBLIC_TEST_URL || 'http://localhost:4174';
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

(async () => {
  const browser = await chromium.launch({ executablePath: executablePath || undefined });
  try {
    for (const width of [1440, 768]) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, hasTouch: width < 500, isMobile: width < 500 });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.addInitScript(() => sessionStorage.setItem('vanta-intro-seen', 'true'));
      assert.equal((await page.goto(base + '/artists/')).status(), 200);
      await page.getByRole('heading', { level: 1, name: /Show your work\. Get booked\. Vanta runs the rest\./ }).waitFor();
      const main = page.locator('main:visible');
      assert.equal(await main.evaluate(el => el.scrollWidth <= el.clientWidth + 1), true, `no sideways scroll at ${width}`);

      // The questionnaire: answering sends and stores nothing
      const requests = [];
      page.on('request', request => { if (!/\.(js|css|webp|png|jpg|woff2)(\?|$)/.test(request.url())) requests.push(request.url()); });
      const rules = page.locator('#your-rules');
      assert.equal(await page.locator('#your-form').isVisible(), false, 'the page ends at the questions until they are answered');
      assert.equal(await page.locator('#get-vanta').isVisible(), false, 'nothing below the questions before the answers');
      await rules.scrollIntoViewIfNeeded();
      await rules.getByRole('heading', { name: 'How do you price your work?' }).waitFor();
      await rules.getByRole('button', { name: /I quote each piece/ }).click();
      await rules.getByRole('heading', { name: 'Can clients book a slot straight away?' }).waitFor();
      await rules.getByRole('button', { name: '← Back' }).click();
      await rules.getByRole('button', { name: /I quote each piece/ }).click();
      await rules.getByRole('button', { name: /they tell me when they’re free/ }).click();
      assert.equal(await rules.getByLabel('Pricing').inputValue(), 'quote');
      assert.equal(await rules.getByLabel('Deposit', { exact: true }).inputValue(), '50', 'deposit starts at $50');
      await rules.getByLabel('Deposit', { exact: true }).selectOption('100');
      assert.equal(await rules.getByLabel('Deposit refund').inputValue(), 'never', 'deposit never refunded by default');
      await rules.getByLabel('Cancel and reschedule notice').selectOption('168');
      assert.equal(await rules.getByLabel('How clients pick a time').inputValue(), 'avail');
      assert.equal(await rules.getByLabel('Deposit', { exact: true }).inputValue(), '100');
      assert.match(await rules.getByRole('figure').textContent(), /When are you free\?.*photos required.*Cancel or move your booking up to 7 days before\. The deposit isn’t refunded/s);
      await rules.getByLabel('How clients pick a time').selectOption('instant');
      assert.match(await rules.getByRole('figure').textContent(), /Pick a time.*Pay \$100 and book/s);
      await rules.getByRole('button', { name: '← Start again' }).click();
      // The questions can't be skipped: the result and the preview only come after both answers
      assert.equal(await rules.getByRole('button', { name: /Skip/ }).count(), 0, 'no way to skip the questions');
      assert.equal(await rules.getByRole('figure').count(), 0, 'no preview before the answers');
      assert.equal(await rules.getByRole('button', { name: /See every setting/ }).count(), 0, 'no settings list before the answers');
      await rules.getByRole('button', { name: /A set rate/ }).click();
      assert.equal(await rules.getByRole('figure').count(), 0, 'no preview after one answer');
      await rules.getByRole('button', { name: /Yes, straight into a slot/ }).click();
      assert.equal(await rules.getByLabel('Deposit refund').inputValue(), 'never');
      assert.deepEqual(requests, [], 'the questionnaire makes no requests');
      assert.equal(await page.evaluate(() => localStorage.length), 0, 'nothing kept in the browser');

      // Every setting: the button opens the full list in a modal, Esc closes it and focus goes back
      const more = rules.getByRole('button', { name: /See every setting/ });
      await more.click();
      const dialog = page.getByRole('dialog', { name: 'Every setting' });
      await dialog.waitFor();
      for (const name of ['Buffer before and after', 'Reschedule notice', 'Who pays the Vanta booking fee', 'A consent form for each studio']) assert.match(await dialog.textContent(), new RegExp(name));
      const dialogBox = await dialog.boundingBox();
      assert.ok(dialogBox.width <= width && dialogBox.x >= 0, 'the dialog fits the screen');
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'hidden' });
      assert.equal(await page.evaluate(() => document.activeElement?.textContent?.includes('See every setting')), true, 'focus returns to the button');
      await more.click();
      await dialog.getByRole('button', { name: 'Close' }).click();
      await dialog.waitFor({ state: 'hidden' });

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
      console.log(`PASS ${width}: artist page, questionnaire (no data), rules sentence, every-setting modal, form builder, Vanta Pro`);
      await page.close();
    }

    for (const width of [390, 320]) {
      const page = await browser.newPage({ viewport: { width, height: 760 }, hasTouch: true, isMobile: true });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.addInitScript(() => sessionStorage.setItem('vanta-intro-seen', 'true'));
      assert.equal((await page.goto(base + '/artists/')).status(), 200);
      await page.getByRole('heading', { level: 1, name: /Show your work\. Get booked\. Vanta runs the rest\./ }).waitFor();
      const main = page.locator('main:visible');
      assert.equal(await main.count(), 1, 'one page shows on a phone');
      assert.equal(await main.locator('#m-top').count(), 1, 'the phone page is the one showing');
      assert.equal(await main.evaluate(el => el.scrollWidth <= el.clientWidth + 1), true, `no sideways scroll at ${width}`);
      const smallTargets = await main.evaluate(root => [...root.querySelectorAll('a, button')].filter(el => {
        const box = el.getBoundingClientRect();
        return box.width && box.height && box.height < 38 && !el.closest('[aria-hidden=true], dialog, footer, [role=tablist]');
      }).map(el => el.textContent.trim() || el.getAttribute('aria-label')));
      assert.deepEqual(smallTargets, [], 'every button is a thumb-sized target');
      const bar = page.getByRole('complementary', { name: 'Get the Vanta app' });
      assert.equal(await bar.getAttribute('data-show'), 'false', 'no download bar on the first screen');

      // First screen: the toggle switches the phone between the client's form and the artist's day
      await page.getByRole('tab', { name: 'What you see' }).click();
      await page.locator('#m-top [data-side=you]').waitFor();
      assert.match(await page.locator('#m-top').textContent(), /Today.*Sam Taylor/s, "the app's Home screen");

      // Your rules: two questions, then the booking page they lead to, and a settings tab whose rows open bottom sheets
      const requests = [];
      page.on('request', request => { if (!/\.(js|css|webp|png|jpg|woff2)(\?|$)/.test(request.url())) requests.push(request.url()); });
      const rules = page.locator('#m-rules');
      await rules.scrollIntoViewIfNeeded();
      assert.equal(await rules.getByRole('figure').count(), 0, 'no preview before the answers');
      assert.equal(await rules.getByRole('button', { name: /Your setup|See every setting|Skip/ }).count(), 0, 'nothing past the questions before the answers');
      assert.equal(await page.locator('#m-form').isVisible(), false, 'the page ends at the questions until they are answered');
      assert.equal(await rules.getByRole('heading', { name: 'How do you price your work?' }).count(), 0, 'the questions wait for Start');
      assert.equal(await rules.getByRole('button', { name: /I quote each piece/ }).count(), 0, 'nothing to scroll to past the intro before Start');
      // One idea per screen: Start opens question one; each answer moves on to the next screen
      await rules.getByRole('button', { name: /^Start/ }).click();
      await rules.getByRole('heading', { name: 'How do you price your work?' }).waitFor();
      assert.equal(await rules.getByRole('heading', { name: 'Can clients book a slot straight away?' }).count(), 0, 'question two waits for question one');
      await rules.getByRole('button', { name: /I quote each piece/ }).click();
      await rules.getByRole('heading', { name: 'Can clients book a slot straight away?' }).waitFor();
      // The questions page sideways: Back slides to question one, and question one's answer slides on again
      await rules.getByRole('button', { name: 'Back' }).click();
      await rules.getByRole('button', { name: /I quote each piece/ }).click();
      await rules.getByRole('button', { name: /they tell me when they’re free/ }).click();
      const preview = rules.getByRole('figure', { name: /Your booking page/ });
      await preview.waitFor();
      // The booking page as the product draws it, and it steps like the real one
      assert.equal(await rules.getByRole('navigation', { name: 'Steps' }).getByRole('button', { name: 'Your booking page' }).getAttribute('aria-current'), 'step');
      assert.match(await preview.textContent(), /Make a booking.*Session Type.*What appointment would you like\?.*Custom piece.*Quoted on request/s);
      await preview.getByRole('button', { name: 'Continue' }).click();
      await preview.getByRole('button', { name: 'Continue' }).click();
      assert.match(await preview.textContent(), /Availability.*When are you available\?/s);
      // Your setup: every setting in one sheet, each change jumps the page to where it shows
      await rules.getByRole('button', { name: /Your setup/ }).click();
      const setupSheet = page.getByRole('dialog', { name: 'Your setup' });
      await setupSheet.waitFor();
      assert.equal(await setupSheet.getByRole('radiogroup').count(), 7, 'all seven settings in one place');
      assert.equal(await setupSheet.getByRole('radiogroup', { name: 'Pricing' }).getByRole('radio', { checked: true }).textContent(), 'Quote each piece');
      assert.equal(await setupSheet.getByRole('radiogroup', { name: 'Deposit', exact: true }).getByRole('radio', { checked: true }).textContent(), '$50', 'deposit starts at $50');
      assert.equal(await setupSheet.getByRole('radiogroup', { name: 'Deposit refund' }).getByRole('radio', { checked: true }).textContent(), 'Never');
      await setupSheet.getByRole('radiogroup', { name: 'Deposit', exact: true }).getByRole('radio', { name: '$100' }).click();
      assert.match(await preview.textContent(), /Review your request.*Deposit\$100.*Send request/s);
      await setupSheet.getByRole('radiogroup', { name: 'How clients book' }).getByRole('radio', { name: 'Book a slot' }).click();
      assert.match(await preview.textContent(), /Time.*Choose a time/s);
      await preview.getByRole('button', { name: 'Continue' }).click();
      await preview.getByRole('button', { name: 'Continue' }).click();
      assert.match(await preview.textContent(), /Review and pay.*Pay \$100 deposit/s);
      await setupSheet.getByRole('button', { name: /See every setting/ }).click();
      const all = page.getByRole('dialog', { name: 'Every setting' });
      await all.waitFor();
      assert.match(await all.textContent(), /Buffer before and after.*Reschedule notice/s);
      const allBox = await all.boundingBox();
      assert.ok(allBox.x >= 0 && allBox.width <= width, 'the settings sheet fits the phone');
      await page.keyboard.press('Escape');
      await all.waitFor({ state: 'hidden' });
      await setupSheet.getByRole('button', { name: 'Done' }).click();
      await setupSheet.waitFor({ state: 'hidden' });
      assert.deepEqual(requests, [], 'the questionnaire makes no requests');

      // Booking form: switch a question, then see the form clients get
      const form = page.locator('#m-form');
      await form.scrollIntoViewIfNeeded();
      // Each question is one chip; a tap moves it Required -> Optional -> Off
      await form.getByRole('button', { name: /^Allergies: Off/ }).click();
      await form.getByRole('button', { name: /^Allergies: Required/ }).click();
      await form.getByRole('button', { name: /^Allergies: Optional/ }).waitFor();
      await form.getByRole('button', { name: /See the form clients get/ }).click();
      const formSheet = page.getByRole('dialog', { name: 'The form clients get' });
      await formSheet.waitFor();
      assert.match(await formSheet.getByRole('figure').textContent(), /AllergiesOptional/);
      await formSheet.getByRole('button', { name: 'Done' }).click();
      await formSheet.waitFor({ state: 'hidden' });

      // Every request: the carousel's dots move between slides
      const day = page.locator('#m-day');
      await day.scrollIntoViewIfNeeded();
      await day.getByRole('button', { name: 'Show Booking details' }).click();
      await page.waitForFunction(() => document.querySelector('#m-day [aria-label="Show Booking details"]')?.getAttribute('aria-current') === 'true');

      // Your work and Pro
      const work = page.locator('#m-work');
      await work.scrollIntoViewIfNeeded();
      await work.getByRole('tab', { name: 'In your form' }).click();
      await work.getByRole('heading', { name: 'Win the booking' }).waitFor();
      const pro = page.locator('#m-pro');
      await pro.scrollIntoViewIfNeeded();
      await pro.getByRole('tab', { name: 'Your link' }).click();
      assert.match(await pro.locator('[data-on=true]').textContent(), /mia\.vanta\.tattoo/);
      assert.doesNotMatch(await pro.getByRole('figure').textContent(), /mia\.vanta\.tattoo/, 'the address is not in texts or emails');
      await pro.getByRole('tab', { name: 'Free' }).click();
      assert.match(await pro.textContent(), /Portfolio in the feed/);
      assert.equal(await bar.getAttribute('data-show'), 'true', 'the download bar shows once the first screen has gone');
      assert.equal(await bar.getByRole('link').getAttribute('href'), 'https://apps.apple.com/au/app/vanta-find-your-next-tattoo/id6760996738');
      // Once the questions are answered the bar is a tab bar: tapping a section scrolls to it and marks it current
      const tabs = bar.getByRole('navigation', { name: 'Sections' });
      await tabs.getByRole('button', { name: 'Form' }).click();
      await page.waitForTimeout(1200);
      assert.ok(Math.abs(await page.evaluate(() => document.getElementById('m-form').getBoundingClientRect().top)) < 4, 'the section lands at the top of the screen');
      await page.waitForFunction(() => document.querySelector('nav[aria-label=Sections] [aria-current=true]')?.textContent === 'Form');
      // The first screen's two sides also page by swiping
      await page.locator('#m-top').evaluate(top => { const t = top.querySelector('[class*=swipeTrack]'); t.scrollTo({ left: 0 }); });
      assert.equal(await page.evaluate(() => localStorage.length), 0, 'nothing kept in the browser');
      assert.deepEqual(errors, []);
      console.log(`PASS ${width}: phone page, first-screen toggle, questions to settings sheets, every setting, form builder, carousel, work, Pro, download bar`);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
