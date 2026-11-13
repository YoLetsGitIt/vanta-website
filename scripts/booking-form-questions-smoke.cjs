// The artist's booking form decides every question on their booking link: here placement
// is off, design optional, size required, skin tone optional and weekly availability off.
// Serve out/ with clean URLs first. All backend and auth calls are mocked.
// VANTA_PLAYWRIGHT_PATH=/path/to/playwright VANTA_BOOKING_TEST_URL=http://127.0.0.1:3072 node scripts/booking-form-questions-smoke.cjs
const assert = require('node:assert/strict');
const { chromium } = require(process.env.VANTA_PLAYWRIGHT_PATH || 'playwright');
const fillDob = async (page, iso) => { const [y, m, d] = iso.split('-'); const g = page.getByRole('group', { name: 'Date of birth', exact: true }).first(); await g.getByLabel('Day of birth').selectOption(String(+d)); await g.getByLabel('Month of birth').selectOption(String(+m)); await g.getByLabel('Year of birth').selectOption(y); };
const base = process.env.VANTA_BOOKING_TEST_URL || 'http://127.0.0.1:3072';
const shots = process.env.VANTA_SCREENSHOT_DIR;
const api = 'https://inkspire-backend-xa2a.onrender.com';
const artistId = 'a2126c9c-8910-44d6-a73e-7aed20de405e';
const form = {
  body_location: { enabled: false, required: false },
  design_details: { enabled: true, required: false },
  size: { enabled: true, required: true },
  skin_tone: { enabled: true, required: false },
  color: { enabled: false, required: false },
  image_paths: { enabled: false, required: false },
  notes: { enabled: false, required: false },
  allergies: { enabled: false, required: false },
  availability_windows: { enabled: false, required: false },
  address: { enabled: false, required: false },
};

(async () => {
  const browser = await chromium.launch();
  try {
    for (const width of [390, 1280]) {
      const c = await browser.newContext({ viewport: { width, height: 900 } });
      await c.route('https://aznxvdnpvbcofaqxgmtu.supabase.co/**', route => route.fulfill({ status: 401, json: {} }));
      let booked;
      await c.route(`${api}/**`, route => {
        const req = route.request(), path = new URL(req.url()).pathname;
        if (path === `/artists/${artistId}`) return route.fulfill({ json: { id: artistId, name: 'Alex Ink', serviceType: 'both' } });
        if (path === `/artists/${artistId}/booking-form`) return route.fulfill({ json: { fields: form } });
        if (path.endsWith('/work-schedule')) return route.fulfill({ json: { schedule: [] } });
        if (path === '/bookings/guest') { booked = req.postDataJSON(); return route.fulfill({ status: 201, json: { id: 'b' } }); }
        return route.fulfill({ json: {} });
      });
      const page = await c.newPage();
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.goto(`${base}/bookings?artist=${artistId}`, { waitUntil: 'networkidle' });
      await page.getByRole('heading', { name: 'What appointment would you like?' }).waitFor();
      await page.getByRole('button', { name: /^Small/ }).click();
      const next = page.getByRole('button', { name: 'Continue', exact: true });
      await next.click();

      // Design step: no placement, design optional, size required, skin tone offered.
      await page.getByText('SIZE', { exact: true }).waitFor();
      assert.equal(await page.getByRole('button', { name: 'Select placement…' }).count(), 0, 'Placement is off');
      assert.equal(await page.getByRole('radiogroup', { name: 'Skin tone' }).count(), 1, 'Skin tone asked');
      assert.equal(await page.getByText('REFERENCE PHOTOS').count(), 0, 'Photos are off');
      assert(await next.isDisabled(), 'Size is required');
      await page.locator('#booking-size').fill('12');
      await page.getByRole('button', { name: 'in', exact: true }).click();
      await page.getByRole('radio', { name: 'Olive' }).click();
      assert(await next.isEnabled(), 'Design is optional');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'No sideways scroll');
      if (shots) await page.screenshot({ path: `${shots}/form-design-${width}.png`, fullPage: true });
      await next.click();

      // No weekly availability: the artist sends times instead.
      await page.getByText('they’ll send you times to choose from', { exact: false }).waitFor();
      if (shots) await page.screenshot({ path: `${shots}/form-time-${width}.png`, fullPage: true });
      assert(await next.isEnabled(), 'Nothing to fill in without availability');
      await next.click();

      await page.getByLabel('First name', { exact: true }).fill('Guest');
      await page.getByLabel('Last name', { exact: true }).fill('Client');
      await page.getByRole('checkbox', { name: /Create a Vanta account/ }).uncheck();
      await page.getByLabel('Email', { exact: true }).fill('guest@example.test');
      await page.getByLabel('Phone number', { exact: true }).fill('0400 555 666');
      await fillDob(page, '1995-07-08');
      await next.click();

      await page.getByText('12 in', { exact: true }).waitFor();
      await page.getByText('Olive', { exact: true }).waitFor();
      assert.equal(await page.getByText('AVAILABILITY', { exact: true }).count(), 0, 'No empty availability in the review');
      if (shots) await page.screenshot({ path: `${shots}/form-review-${width}.png`, fullPage: true });
      await page.getByRole('button', { name: 'Send Request', exact: true }).click();
      await page.getByText('Request sent', { exact: false }).first().waitFor();
      assert.equal(booked.size, '12in');
      assert.equal(booked.size_unit, 'in');
      assert.equal(booked.skin_tone, 'Olive');
      assert.equal(booked.body_location, '');
      assert.equal(booked.design_details, '');
      assert.deepEqual(booked.availability_windows, []);
      assert.deepEqual(errors, []);
      console.log(`PASS artist booking form questions at ${width}px`);
      await c.close();
    }
  } finally {
    await browser.close();
  }
})().catch(err => { console.error(err); process.exit(1); });
