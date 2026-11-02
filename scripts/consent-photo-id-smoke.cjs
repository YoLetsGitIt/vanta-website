// Studio consent link with a photo ID field: the photo uploads privately and its path
// is the answer. Covers studio links (/studios/{id}/id-upload-sign) and booking consent
// links (bc_ tokens). Serve out/ with clean URLs first; all services are mocked.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.VANTA_PLAYWRIGHT_PATH || 'playwright');
const base = process.env.VANTA_BOOKING_TEST_URL || 'http://127.0.0.1:3072';
const studioId = '11111111-1111-4111-8111-111111111111';
const template = { id: 'tmpl-1', name: 'Consent', requires_signature: false, fields: [{ id: 'photo', type: 'photo_id', label: 'Photo ID', required: true }] };
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

(async () => {
  const browser = await chromium.launch();
  try {
    for (const token of ['ct_studio', 'bc_booking']) {
      const context = await browser.newContext({ viewport: { width: 390, height: 900 } });
      const calls = { signs: [], submits: [] };
      await context.route('https://**', route => {
        const req = route.request(), url = new URL(req.url());
        if (url.pathname.endsWith('/id-upload-sign')) { calls.signs.push(url.pathname); return route.fulfill({ json: { upload_url: 'https://storage.example.test/up', storage_object_path: `ids/${studioId}/22222222-2222-4222-8222-222222222222.jpg` } }); }
        if (url.hostname === 'storage.example.test') return route.fulfill({ status: 200 });
        if (url.pathname.startsWith('/public/') && req.method() === 'GET') return route.fulfill({ json: { studio_id: studioId, studio_name: 'Ink Studio', templates: [template], email: 'c@example.test', booking_consent: token.startsWith('bc_') } });
        if (url.pathname.startsWith('/public/') && req.method() === 'POST') { calls.submits.push(req.postDataJSON()); return route.fulfill({ json: { ok: true } }); }
        return route.fulfill({ json: {} });
      });
      const page = await context.newPage();
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.goto(`${base}/consent?token=${token}`, { waitUntil: 'networkidle' });
      await page.getByText('Take or choose a photo of your ID').waitFor();
      if (token.startsWith('bc_')) {
        await page.getByLabel('Full name', { exact: true }).fill('Consent Client');
        await page.getByLabel('Date of birth').fill('1990-01-01');
      }
      await page.getByLabel('Photo ID').setInputFiles({ name: 'id.png', mimeType: 'image/png', buffer: png });
      await page.getByRole('img', { name: 'Your photo ID' }).waitFor();
      for (const box of await page.getByRole('checkbox').all()) await box.check();
      await page.getByRole('button', { name: 'Submit consent', exact: true }).click();
      await page.getByRole('heading', { name: /Consent recorded|Thank you/i }).waitFor();
      assert.equal(calls.signs[0], token.startsWith('bc_') ? `/public/booking-consent/${token}/id-upload-sign` : `/studios/${studioId}/id-upload-sign`);
      assert.equal(calls.submits[0].submissions[0].answers.photo, `ids/${studioId}/22222222-2222-4222-8222-222222222222.jpg`);
      assert.deepEqual(errors, []);
      console.log(`PASS photo ID on consent link (${token})`);
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
