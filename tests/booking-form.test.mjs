import test from 'node:test';
import assert from 'node:assert/strict';
import { formQuestion } from '../lib/booking-form.mjs';

test('with no form saved, the link asks what it always asked', () => {
  assert.deepEqual(formQuestion(null, null, 'image_paths'), { asked: true, required: true });
  assert.deepEqual(formQuestion(null, null, 'color'), { asked: true, required: true });
  assert.deepEqual(formQuestion(null, null, 'notes'), { asked: true, required: false });
  assert.deepEqual(formQuestion(null, null, 'allergies'), { asked: false, required: false });
  assert.deepEqual(formQuestion(null, null, 'address'), { asked: false, required: false });
});

test('the artist turns questions off, on or required', () => {
  const form = { image_paths: { enabled: false, required: true }, notes: { enabled: true, required: true }, allergies: { enabled: true, required: false } };
  assert.deepEqual(formQuestion(form, null, 'image_paths'), { asked: false, required: false });
  assert.deepEqual(formQuestion(form, null, 'notes'), { asked: true, required: true });
  assert.deepEqual(formQuestion(form, null, 'allergies'), { asked: true, required: false });
});

test("a studio's own questions and requirements still apply", () => {
  const artist = { image_paths: { enabled: false }, allergies: { enabled: false } };
  const studio = { image_paths: { enabled: true, required: true }, notes: { enabled: true, required: false }, allergies: { enabled: true, required: true }, address: { enabled: true, required: false } };
  assert.deepEqual(formQuestion(artist, studio, 'image_paths'), { asked: true, required: true });
  assert.deepEqual(formQuestion({ notes: { enabled: false } }, studio, 'notes'), { asked: false, required: false });
  assert.deepEqual(formQuestion(artist, studio, 'allergies'), { asked: true, required: true });
  assert.deepEqual(formQuestion(artist, studio, 'address'), { asked: true, required: false });
});
