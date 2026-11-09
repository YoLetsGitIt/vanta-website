import assert from 'node:assert/strict';
import test from 'node:test';
import { flashBookingState, flashNotice, flashPrefill, flashPriceLabel, isFlashReference } from '../lib/booking-flash.mjs';

const artist = 'a2126c9c-8910-44d6-a73e-7aed20de405e';
const post = { id: '0b8e2c55-1d7a-4b0e-9a55-7f3f3d2b1c11', artist_id: artist, work_type: 'flash', title: 'Swallow', price_from: 250, body_part: ['Forearm'], colour_style: 'Color', colour_details: 'red, teal' };

test('only UUIDs are treated as flash links', () => {
  assert.equal(isFlashReference(post.id), true);
  for (const v of ['', null, 'abc', `${post.id}x`]) assert.equal(isFlashReference(v), false);
});

test('a bookable flash from this artist is attached', () => {
  assert.equal(flashBookingState(post, artist).status, 'ok');
  assert.equal(flashBookingState(post, artist.toUpperCase()).status, 'ok');
});

test('another artist’s post, tattoo work or a missing post is never attached', () => {
  assert.equal(flashBookingState({ ...post, artist_id: '00000000-0000-0000-0000-000000000000' }, artist).status, 'invalid');
  assert.equal(flashBookingState({ ...post, work_type: 'tattoo' }, artist).status, 'invalid');
  assert.equal(flashBookingState(null, artist).status, 'invalid');
});

test('claimed and ended flash explain why and fall back to a regular request', () => {
  const claimed = flashBookingState({ ...post, flash_claimed: true }, artist);
  assert.equal(claimed.status, 'claimed');
  assert.match(flashNotice(claimed, 'Alex'), /already been booked.*Alex/);
  assert.equal(flashBookingState({ ...post, flash_ended: true }, artist).status, 'ended');
  assert.equal(flashBookingState({ ...post, flash_ends_at: '2000-01-01T00:00:00Z' }, artist).status, 'ended');
  assert.equal(flashBookingState({ ...post, flash_ends_at: '2999-01-01T00:00:00Z' }, artist).status, 'ok');
});

test('price and prefill follow the post', () => {
  assert.equal(flashPriceLabel(post), '$250');
  assert.equal(flashPriceLabel({ price_from: 200, price_to: 300 }), '$200–$300');
  assert.equal(flashPriceLabel({}), '');
  assert.deepEqual(flashPrefill(post), { designDetails: 'Flash: Swallow', bodyLocations: ['Forearm'], colourStyle: 'Color', colourDetails: 'red, teal' });
  assert.equal(flashPrefill({ ...post, colour_style: 'Black' }).colourStyle, '');
});
