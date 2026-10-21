export function bookingStudios(artist) {
  const seen = new Set();
  return (Array.isArray(artist?.studios) ? artist.studios : []).filter(studio => {
    if (!studio?.id || studio.associationStatus === 'rejected' || seen.has(studio.id)) return false;
    seen.add(studio.id);
    return true;
  });
}

export function timeMinutes(value) {
  if (typeof value !== 'string' || !/^\d{2}:\d{2}(:00)?$/.test(value)) return NaN;
  const [hour, minute] = value.split(':').map(Number);
  return hour <= 23 && minute <= 59 ? hour * 60 + minute : NaN;
}

function validHours(rows) {
  return (Array.isArray(rows) ? rows : []).filter(row =>
    Number.isInteger(row.day_of_week) && row.day_of_week >= 0 && row.day_of_week <= 6 &&
    timeMinutes(row.start_time) < timeMinutes(row.end_time)
  ).map(row => ({ ...row, start_time: row.start_time.slice(0, 5), end_time: row.end_time.slice(0, 5) }));
}

// Unassigned legacy days belong to a studio only when there is one regular
// location. With multiple studios, never offer another location's working day.
export function scheduleForStudio(schedule, studios, studioId) {
  const hours = validHours(schedule);
  if (!studios.length) return hours;
  const studio = studios.find(item => item.id === studioId);
  if (!studio) return [];
  const regular = studios.filter(item => !item.guestWork);
  const selected = hours.filter(row => row.studio_id === studioId ||
    (!row.studio_id && regular.length === 1 && regular[0].id === studioId));
  // The public profile also contains hours already scoped by the backend.
  return selected.length ? selected : validHours(studio.workingDays);
}

export function windowsFitSchedule(windows, schedule, restricted) {
  return windows.length > 0 && windows.every(window => {
    const start = timeMinutes(window.startTime), end = timeMinutes(window.endTime);
    if (!(start < end) || !Number.isInteger(window.dayOfWeek) || window.dayOfWeek < 0 || window.dayOfWeek > 6) return false;
    return !restricted || schedule.some(day => day.day_of_week === window.dayOfWeek &&
      start >= timeMinutes(day.start_time) && end <= timeMinutes(day.end_time));
  });
}
