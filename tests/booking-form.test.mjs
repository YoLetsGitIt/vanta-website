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

test('the artist form has the studio questions, defaulting to what the link asked', () => {
  assert.deepEqual(formQuestion(null, null, 'design_details'), { asked: true, required: true });
  assert.deepEqual(formQuestion(null, null, 'body_location'), { asked: true, required: true });
  assert.deepEqual(formQuestion(null, null, 'availability_windows'), { asked: true, required: true });
  assert.deepEqual(formQuestion(null, null, 'size'), { asked: false, required: false });
  assert.deepEqual(formQuestion(null, null, 'skin_tone'), { asked: false, required: false });
  // An older server sends only the first four questions: the rest stay as they were.
  const older = { image_paths: { enabled: true, required: true }, color: { enabled: true, required: true }, notes: { enabled: true }, allergies: { enabled: false } };
  assert.deepEqual(formQuestion(older, null, 'design_details'), { asked: true, required: true });
  assert.deepEqual(formQuestion(older, null, 'availability_windows'), { asked: true, required: true });
});

test('the artist can make placement, design and availability optional or off', () => {
  const form = { body_location: { enabled: false }, design_details: { enabled: true, required: false }, availability_windows: { enabled: false }, size: { enabled: true, required: true }, skin_tone: { enabled: true } };
  assert.deepEqual(formQuestion(form, null, 'body_location'), { asked: false, required: false });
  assert.deepEqual(formQuestion(form, null, 'design_details'), { asked: true, required: false });
  assert.deepEqual(formQuestion(form, null, 'availability_windows'), { asked: false, required: false });
  assert.deepEqual(formQuestion(form, null, 'size'), { asked: true, required: true });
  assert.deepEqual(formQuestion(form, null, 'skin_tone'), { asked: true, required: false });
  // A studio on Vanta Studio that requires one still gets it.
  assert.deepEqual(formQuestion(form, { body_location: { enabled: true, required: true } }, 'body_location'), { asked: true, required: true });
});
