// A studio consent form sent by email can ask for the client's address with an address
// field. The address fields show where the field sits in the form, under its label; a
// required address stops the form being sent until it's filled in; the one-line address
// is sent as the field's answer with the parts beside it.
// Serve out/ first. All backend calls are mocked.
// VANTA_PLAYWRIGHT_PATH=/path/to/playwright VANTA_BOOKING_TEST_URL=http://127.0.0.1:3072 node scripts/consent-address-smoke.cjs
const assert = require('node:assert/strict');
const { chromium } = require(process.env.VANTA_PLAYWRIGHT_PATH || 'playwright');
const base = process.env.VANTA_BOOKING_TEST_URL || 'http://127.0.0.1:3072';
(async () => {
  const browser = await chromium.launch();
  for (const width of [390, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    let sent = null;
    const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' };
    await page.route(/inkspire-backend/, r => {
      if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: cors });
      if (!/\/public\/consent\/tok_1$/.test(r.request().url())) return r.fulfill({ json: {}, headers: cors });
      if (r.request().method() === 'POST') { sent = JSON.parse(r.request().postData()); return r.fulfill({ json: { ok: true }, headers: cors }); }
      return r.fulfill({ headers: cors, json: { studio_id: 's1', studio_name: 'Northside Tattoo', signer_name: 'Sam Lee', expires_at: '2099-01-01T00:00:00Z', dob: '1995-01-02', templates: [{ id: 't1', name: 'Tattoo consent', requires_signature: false, fields: [
        { id: 'q', type: 'yesno', label: 'Are you feeling well today?' },
        { id: 'home', type: 'address', label: 'Home address', required: true },
        { id: 'meds', type: 'text', label: 'Medications' },
      ] }] } });
    });
    await page.goto(`${base}/consent?token=tok_1`, { waitUntil: 'networkidle' });
    await page.getByText('Home address').first().waitFor();
    const order = await page.evaluate(() => {
      const legend = [...document.querySelectorAll('legend')].find(el => el.textContent.startsWith('Home address'));
      const meds = [...document.querySelectorAll('*')].find(el => el.childElementCount === 0 && el.textContent.trim() === 'Medications');
      return legend && meds ? Boolean(legend.compareDocumentPosition(meds) & Node.DOCUMENT_POSITION_FOLLOWING) : null;
    });
    assert.equal(order, true, 'address sits where the field is');
    await page.getByRole('button', { name: /submit|sign/i }).last().click();
    await page.waitForTimeout(300);
    assert.equal(sent, null, 'not sent without the required address');
    assert.equal(await page.getByLabel('Street address', { exact: false }).evaluate(e => e.validity.valueMissing), true, 'street address required');
    await page.getByLabel('Street address', { exact: false }).fill('8 Lygon St');
    await page.getByLabel('Suburb or city', { exact: false }).fill('Carlton');
    await page.locator('select[autocomplete="address-level1"]').selectOption('VIC');
    await page.getByLabel('Postcode', { exact: false }).fill('3053');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'no sideways scroll');
    await page.getByRole('button', { name: /submit|sign/i }).last().click();
    await page.waitForTimeout(800);
    const a = sent?.submissions?.[0]?.answers;
    assert.equal(a?.home, '8 Lygon St, Carlton VIC 3053, Australia');
    assert.equal(JSON.parse(a.__address_parts__).postcode, '3053');
    assert.deepEqual(errors, []);
    console.log('PASS website consent address at', width);
    await page.close();
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
