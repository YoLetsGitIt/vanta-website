import assert from 'node:assert/strict';
import test from 'node:test';
import { bookingStudios, scheduleForStudio, windowsFitSchedule } from '../lib/booking-studios.mjs';

const studios = [{ id: 'north', name: 'North' }, { id: 'south', name: 'South' }];
const schedule = [
  { day_of_week: 1, start_time: '09:00:00', end_time: '17:00:00', studio_id: 'north' },
  { day_of_week: 3, start_time: '12:15:00', end_time: '19:45:00', studio_id: 'south' },
  { day_of_week: 5, start_time: '10:00', end_time: '18:00', studio_id: null },
];

test('each studio offers only its assigned weekdays and hours', () => {
  assert.deepEqual(scheduleForStudio(schedule, studios, 'north').map(day => day.day_of_week), [1]);
  assert.deepEqual(scheduleForStudio(schedule, studios, 'south'), [
    { ...schedule[1], start_time: '12:15', end_time: '19:45' },
  ]);
  assert.deepEqual(scheduleForStudio(schedule, studios, ''), []);
  assert.deepEqual(scheduleForStudio(schedule, studios, 'unknown'), []);
});

test('unassigned hours belong only to a sole regular studio, never a guest location', () => {
  const oneRegular = [studios[0], { id: 'guest', guestWork: true }];
  assert.deepEqual(scheduleForStudio(schedule, oneRegular, 'north').map(day => day.day_of_week), [1, 5]);
  assert.deepEqual(scheduleForStudio(schedule, oneRegular, 'guest'), []);
});

test('empty or unavailable studio schedules cannot open all days', () => {
  assert.deepEqual(scheduleForStudio([], studios, 'south'), []);
  assert.equal(windowsFitSchedule([{ dayOfWeek: 1, startTime: '09:00', endTime: '12:00' }], [], true), false);
  const profileHours = [{ ...studios[1], workingDays: [schedule[1]] }];
  assert.equal(scheduleForStudio(null, profileHours, 'south')[0].start_time, '12:15');
});

test('client windows must fit the selected studio, including partial-hour boundaries', () => {
  const south = scheduleForStudio(schedule, studios, 'south');
  assert.equal(windowsFitSchedule([{ dayOfWeek: 3, startTime: '12:30', endTime: '19:30' }], south, true), true);
  for (const window of [
    { dayOfWeek: 1, startTime: '12:30', endTime: '14:00' },
    { dayOfWeek: 3, startTime: '12:00', endTime: '14:00' },
    { dayOfWeek: 3, startTime: '12:30', endTime: '20:00' },
    { dayOfWeek: 3, startTime: '14:00', endTime: '12:30' },
    { dayOfWeek: 3, startTime: 'invalid', endTime: '14:00' },
  ]) assert.equal(windowsFitSchedule([window], south, true), false);
});

test('independent artists keep the existing client-availability flow', () => {
  const hours = scheduleForStudio(schedule, [], '');
  assert.equal(hours.length, 3);
  assert.equal(windowsFitSchedule([{ dayOfWeek: 0, startTime: '10:00', endTime: '14:00' }], [], false), true);
});

test('rejected studios, duplicates and invalid hours are excluded', () => {
  assert.deepEqual(bookingStudios({ studios: [...studios, studios[0], { id: 'rejected', associationStatus: 'rejected' }, null] }), studios);
  for (const day of [{ ...schedule[0], start_time: 'bad' }, { ...schedule[0], day_of_week: 9 }, { ...schedule[0], end_time: '08:00' }]) {
    assert.deepEqual(scheduleForStudio([day], studios, 'north'), []);
  }
});
