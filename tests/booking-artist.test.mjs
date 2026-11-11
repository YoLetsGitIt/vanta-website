import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveBookingArtist, subdomainReference } from '../lib/booking-artist.mjs';

const artistId = 'a2126c9c-8910-44d6-a73e-7aed20de405e';
test('existing UUID links need no username lookup', async () => {
  assert.equal(await resolveBookingArtist(artistId, 'https://api.test', () => { throw new Error('unexpected lookup'); }), artistId);
});
test('Instagram username links resolve to the account UUID used for booking and referral APIs', async () => {
  const signal = new AbortController().signal;
  const result = await resolveBookingArtist(' InkByAlex ', 'https://api.test', async (url, options) => {
    assert.equal(url, 'https://api.test/artists/by-username/inkbyalex');
    assert.equal(options.cache, 'no-store');
    assert.equal(options.signal, signal);
    return { ok: true, json: async () => ({ artist_id: artistId }) };
  }, signal);
  assert.equal(result, artistId);
});
test('unknown, invalid and malformed responses never become booking identities', async () => {
  for (const name of ['', null, 'alex/ink', 'alex?x=y', '-alex', 'alex-ink', 'a'.repeat(31)]) {
    await assert.rejects(resolveBookingArtist(name, 'https://api.test', () => { assert.fail('invalid username fetched'); }));
  }
  await assert.rejects(resolveBookingArtist('missing', 'https://api.test', async () => ({ ok: false })));
  await assert.rejects(resolveBookingArtist('missing', 'https://api.test', async () => ({ ok: true, json: async () => ({ artist_id: 'another-username' }) })));
});

test('Instagram handles support short names and underscores', async () => {
  for (const name of ['a', 'ab', '_artist_', 'artist.', 'a'.repeat(30)]) {
    assert.equal(await resolveBookingArtist(name, 'https://api.test', async url => {
      assert.equal(url, `https://api.test/artists/by-username/${name}`);
      return { ok: true, json: async () => ({ artist_id: artistId }) };
    }), artistId);
  }
});

test('an artist address names the artist; Vanta own addresses do not', () => {
  assert.equal(subdomainReference('matthew.vanta.tattoo'), 'sub:matthew');
  assert.equal(subdomainReference('Ink-By-Jo.vanta.tattoo'), 'sub:ink-by-jo');
  for (const host of ['vanta.tattoo', 'www.vanta.tattoo', 'studio.vanta.tattoo', 'a.b.vanta.tattoo', 'localhost', 'evil.com', 'matthew.vanta.tattoo.evil.com', 'ab.vanta.tattoo']) {
    assert.equal(subdomainReference(host), '', host);
  }
});
test('an artist address resolves to the artist it was given to', async () => {
  const result = await resolveBookingArtist('sub:matthew', 'https://api.test', async url => {
    assert.equal(url, 'https://api.test/booking-subdomains/matthew');
    return { ok: true, json: async () => ({ artist_id: artistId }) };
  });
  assert.equal(result, artistId);
  await assert.rejects(resolveBookingArtist('sub:nobody', 'https://api.test', async () => ({ ok: false })));
  await assert.rejects(resolveBookingArtist('sub:bad_name', 'https://api.test', () => { assert.fail('invalid name fetched'); }));
});
