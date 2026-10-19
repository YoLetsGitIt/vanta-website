import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveBookingArtist } from '../lib/booking-artist.mjs';

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
