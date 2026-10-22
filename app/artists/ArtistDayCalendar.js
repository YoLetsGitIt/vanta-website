import styles from './artists.module.css';

// Fictional appointments shared by the calendar backdrop and native phone capture.
const appointments = [
  { name: 'Sam Taylor', start: 10, duration: 3, time: '10:00 am – 1:00 pm' },
  { name: 'Alex Morgan', start: 14, duration: 1.5, time: '2:00 pm – 3:30 pm' },
  { name: 'Jamie Lee', start: 16, duration: 1, time: '4:00 pm – 5:00 pm' },
];
const startHour = 9;
const endHour = 18;

export function DayCalendarBackdrop() {
  return <div className={styles.calendarBackdrop} data-day-calendar="" aria-hidden="true">
    <div className={styles.backdropHeader}><span>Today<small>Saturday, 17 October</small></span></div>
    <div className={styles.backdropTimeline}>
      <div className={styles.backdropHours}>{Array.from({ length: endHour - startHour }, (_, index) => {
        const hour = startHour + index;
        return <div className={styles.backdropHour} key={hour}><span>{hour % 12 || 12} {hour < 12 ? 'am' : 'pm'}</span><i /></div>;
      })}</div>
      {appointments.map(booking => <div key={booking.name} className={styles.backdropBooking} data-day-booking="" style={{ top: `${(booking.start - startHour) / (endHour - startHour) * 100}%`, height: `calc(${booking.duration / (endHour - startHour) * 100}% - 4px)` }}><strong>{booking.name}</strong><small>{booking.time}</small></div>)}
    </div>
  </div>;
}

const screenLabels = {
  calendar: 'Vanta Bookings tab: October 2026 calendar with sample appointments for Sam Taylor, Alex Morgan and Jamie Lee',
  policies: 'Vanta client booking preview: deposit confirmation and the artist’s consent form',
  appointment: 'Vanta New Appointment preview: client, appointment details, and date and time',
};

const appointmentScreens = ['appointment', 'appointment-details', 'appointment-schedule'];
const appointmentLabels = ['Client', 'Appointment details', 'Date & time'];
const policyScreens = ['deposit-confirmation', 'client-consent'];
const policyLabels = ['Deposit confirmation', 'Consent form'];

export function NativeBookingsPreview({ className = '', screen = 'calendar', appointmentStep = 0, policyStep = 0 }) {
  const captureImages = name => ['dark', 'light', 'nature', 'space'].map(theme => <img key={theme} data-native-theme={theme} src={`/studio/artist/${name}-${theme}.webp`} width="1206" height="2622" loading="lazy" decoding="async" alt="" />);
  const label = screen === 'appointment' ? `${screenLabels[screen]}. Step ${appointmentStep + 1}: ${appointmentLabels[appointmentStep]}` : screen === 'policies' ? `${screenLabels[screen]}. ${policyLabels[policyStep]}` : screenLabels[screen];
  return <div className={`${styles.nativeBookings} ${className}`} data-app-preview={screen} role="img" aria-label={label}>
    {Object.keys(screenLabels).map(id => <span key={id} className={styles.nativeCapture} data-day-screen={id} hidden={id !== screen}>
      {id === 'appointment' ? appointmentScreens.map((name, index) => <span key={name} className={styles.dayCaptureFrame} data-preview-frame="" data-appointment-step={index} data-active={index === appointmentStep} aria-hidden={index !== appointmentStep}>{captureImages(name)}</span>) : id === 'policies' ? policyScreens.map((name, index) => <span key={name} className={styles.dayCaptureFrame} data-preview-frame="" data-policy-step={index} data-active={index === policyStep} aria-hidden={index !== policyStep}>{captureImages(name)}</span>) : captureImages('bookings')}
    </span>)}
  </div>;
}
