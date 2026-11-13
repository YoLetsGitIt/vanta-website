'use client';

// Clients can't move their own booking online for now. Older confirmation emails still
// link here, so this page explains what to do instead of showing a 404.
const s = {
  wrap: { background: 'var(--page)', color: 'var(--ink)', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  inner: { maxWidth: 440, margin: '0 auto', padding: '48px 24px' },
  heading: { fontSize: 24, fontWeight: 700, marginBottom: 12 },
  sub: { color: 'rgba(var(--ink-rgb), 0.7)', fontSize: 16, lineHeight: 1.5 },
};

export default function RescheduleClient() {
  return (
    <main className="page-scroll" style={s.wrap}>
      <div style={s.inner}>
        <h1 style={s.heading}>Need a different time?</h1>
        <p style={s.sub}>
          Appointments can't be moved online. Contact your studio or artist and they'll find a new time with you.
          Your booking stays as it is until then.
        </p>
      </div>
    </main>
  );
}
