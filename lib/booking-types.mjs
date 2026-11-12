// The session step of the booking form: the artist's own appointment types when they've
// set some up, otherwise the standard sizes (Touch-up, Small, Medium, Large, Piercing).

// Which types to offer at the place being booked. Instant booking: the types that can be
// booked straight away (they carry a deposit). A request: every type set up there.
export function offeredTypes(placeInfo, instantMode) {
  if (instantMode) return placeInfo?.types || [];
  return placeInfo?.booking_types || [];
}

// The size saved with the booking, from how long the appointment takes. Bookings still
// carry a size for the app and older screens.
export function sessionTypeFor(type, services) {
  const piercing = services === 'piercing' || (services === 'both' && /pierc/i.test(type?.name || ''));
  if (piercing) return 'piercing';
  const minutes = Number(type?.duration_minutes) || 0;
  if (minutes <= 180) return 'small';
  if (minutes <= 300) return 'medium';
  return 'large';
}
