import test from 'node:test';
import assert from 'node:assert/strict';
import { offeredTypes, sessionTypeFor } from '../lib/booking-types.mjs';

const small = { id: 'a', name: 'Small tattoo', duration_minutes: 120, deposit: 50 };
const half = { id: 'b', name: 'Half day', duration_minutes: 270, deposit: 50 };

test('instant booking offers the bookable types; a request offers every type set up', () => {
  assert.deepEqual(offeredTypes({ types: [small], booking_types: [small, half] }, true), [small]);
  assert.deepEqual(offeredTypes({ types: [], booking_types: [small, half] }, false), [small, half]);
});

test('no types set up (or an older server): the standard sizes are used', () => {
  assert.deepEqual(offeredTypes({ types: [] }, false), []);
  assert.deepEqual(offeredTypes(null, false), []);
});

test('the saved size comes from how long the appointment takes', () => {
  assert.equal(sessionTypeFor(small, 'tattoo'), 'small');
  assert.equal(sessionTypeFor(half, 'tattoo'), 'medium');
  assert.equal(sessionTypeFor({ name: 'Full day', duration_minutes: 480 }, 'tattoo'), 'large');
  assert.equal(sessionTypeFor({ name: 'Lobe', duration_minutes: 30 }, 'piercing'), 'piercing');
  assert.equal(sessionTypeFor({ name: 'Helix piercing', duration_minutes: 30 }, 'both'), 'piercing');
  assert.equal(sessionTypeFor({ name: 'Flash', duration_minutes: 60 }, 'both'), 'small');
});
