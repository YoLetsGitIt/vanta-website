import test from 'node:test';
import assert from 'node:assert/strict';
import { fullPhone, joinName, splitName, splitPhone, validEmail, validPhone } from '../lib/booking-contact.mjs';

test('Australian mobiles are valid with or without the leading 0', () => {
  assert.equal(validPhone('AU', '0412 345 678'), true);
  assert.equal(validPhone('AU', '412345678'), true);
  assert.equal(validPhone('AU', '0412 345'), false);
  assert.equal(validPhone('AU', '04123456789'), false);
  assert.equal(validPhone('US', '(415) 555-0100'), true);
  assert.equal(validPhone('US', '555-0100'), false);
});

test('the saved phone carries its country code', () => {
  assert.equal(fullPhone('AU', '0412 345 678'), '+61 412 345 678');
  assert.equal(fullPhone('NZ', '021 123 4567'), '+64 211 234 567');
  assert.equal(fullPhone('AU', ''), '');
});

test('a saved phone splits back into country and number', () => {
  assert.deepEqual(splitPhone('+61 412 345 678'), { code: 'AU', number: '412345678' });
  assert.deepEqual(splitPhone('+852 9123 4567'), { code: 'HK', number: '91234567' });
  assert.deepEqual(splitPhone('0412 345 678'), { code: 'AU', number: '0412 345 678' });
  assert.equal(fullPhone(splitPhone('+61 412 345 678').code, splitPhone('+61 412 345 678').number), '+61 412 345 678');
});

test('emails need a name, an @ and a domain', () => {
  assert.equal(validEmail('jane@example.com'), true);
  assert.equal(validEmail(' jane@example.com.au '), true);
  assert.equal(validEmail('jane@example'), false);
  assert.equal(validEmail('jane example.com'), false);
  assert.equal(validEmail('jane@example.c'), false);
});

test('names split into first and last and join back', () => {
  assert.deepEqual(splitName('Jane Smith'), { first: 'Jane', last: 'Smith' });
  assert.deepEqual(splitName('  Mary Jane  van Dyke '), { first: 'Mary', last: 'Jane van Dyke' });
  assert.deepEqual(splitName('Cher'), { first: 'Cher', last: '' });
  assert.equal(joinName(' Jane ', 'Smith '), 'Jane Smith');
});
