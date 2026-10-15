export const bookingHeaders = {
  'X-Booking-Statuses': 'v2',
  'X-Booking-Session-Types': 'v2',
};

export function proposalTimes(booking, now = Date.now()) {
  return [...new Set([
    booking?.proposed_time_primary, booking?.proposed_time_alt1, booking?.proposed_time_alt2,
  ].filter(time => time && Number.isFinite(Date.parse(time)) && Date.parse(time) > now))];
}

export function proposalState(booking, now = Date.now()) {
  if (!['pending', 'proposed'].includes(booking?.status)) return 'unavailable';
  if (booking.user_response_deadline && Date.parse(booking.user_response_deadline) <= now) return 'expired';
  return proposalTimes(booking, now).length ? 'selecting' : 'unavailable';
}

export function bookingReceipt(booking) {
  const paid = Boolean(booking?.deposit_paid_at || booking?.deposit_confirmed_at);
  if (booking?.status === 'confirmed' || booking?.status === 'completed') {
    return {
      title: booking.status === 'completed' ? 'Appointment completed' : 'Booking confirmed',
      message: paid ? 'Your deposit has been received.' : booking.deposit_required
        ? 'Your appointment is confirmed. A deposit payment has not been recorded yet.'
        : 'Your appointment is confirmed. No deposit is required.',
    };
  }
  if (['awaiting_payment', 'awaiting_deposit'].includes(booking?.status)) {
    return { title: 'Waiting for payment confirmation', message: 'Your deposit has not been confirmed yet. If you just paid, check again in a moment.' };
  }
  if (booking?.status === 'requires_confirmation') {
    return { title: 'Appointment requested', message: paid ? 'Your deposit has been received. Your artist still needs to confirm the appointment.' : 'Your artist still needs to confirm the appointment.' };
  }
  return { title: 'Booking not confirmed', message: 'This appointment is not confirmed. Check your booking or contact your artist.' };
}
