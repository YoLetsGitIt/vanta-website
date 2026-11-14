import test from 'node:test';
import assert from 'node:assert/strict';
import { returnMessage } from '../lib/artist-return.mjs';

const message = query => returnMessage(new URLSearchParams(query))[0];

test('back from Stripe or a mailbox, the page says what happened', () => {
  assert.equal(message('?checkout=success'), 'You’re subscribed to Vanta Pro');
  assert.equal(message('?checkout=cancelled'), 'No subscription was set up');
  assert.equal(message('?portal=done'), 'Your plan is up to date');
  assert.equal(message('?mailbox=connected'), 'Mailbox connected');
  assert.equal(message('?mailbox=invalid_state'), 'Mailbox not connected');
});

test('opened directly, it points to the app (there is no sign-in on the web)', () => {
  assert.equal(message(''), 'Vanta Pro is in the app');
});
