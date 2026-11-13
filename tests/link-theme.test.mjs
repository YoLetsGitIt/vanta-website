import test from 'node:test';
import assert from 'node:assert/strict';
import { isLinkPage, LINK_THEME_SCRIPT } from '../lib/link-theme.mjs';

test('pages opened from links are light', () => {
  for (const path of [
    '/bookings', '/bookings.html', '/bookings/abc/confirm', '/booking/tok123', '/consent',
    '/b/parity', '/c/parity', '/w/parity', '/a/x', '/j/abc123', '/join', '/signup',
    '/reset-password', '/email-changed', '/auth/callback', '/artist/account',
  ]) assert.equal(isLinkPage('www.vanta.tattoo', path), true, path);
});

test('marketing pages stay dark', () => {
  for (const path of ['/', '/artists', '/studio', '/studios', '/pricing', '/privacy', '/terms', '/bookingsx', '/consentform'])
    assert.equal(isLinkPage('www.vanta.tattoo', path), false, path);
  assert.equal(isLinkPage('vanta.tattoo', '/'), false);
});

test("an artist's own booking address is light", () => {
  assert.equal(isLinkPage('matthew.vanta.tattoo', '/'), true);
});

test('the head script uses the same rule', () => {
  const run = (hostname, pathname) => {
    const attrs = {};
    const document = { documentElement: { setAttribute: (k, v) => { attrs[k] = v; } } };
    new Function('location', 'document', LINK_THEME_SCRIPT)({ hostname, pathname }, document);
    return attrs['data-link-theme'] === 'light';
  };
  assert.equal(run('www.vanta.tattoo', '/bookings'), true);
  assert.equal(run('www.vanta.tattoo', '/b/parity'), true);
  assert.equal(run('matthew.vanta.tattoo', '/'), true);
  assert.equal(run('www.vanta.tattoo', '/'), false);
  assert.equal(run('www.vanta.tattoo', '/pricing'), false);
});
