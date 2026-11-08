import styles from './BrandLoader.module.css';

// The site's "vanta." wordmark (same as the nav bar).
export function Wordmark({ size = 34, muted = false, style }) {
  return (
    <span
      className={`${styles.wordmark} ${muted ? styles.muted : ''}`}
      style={{ fontSize: size, letterSpacing: -(size / 17), ...style }}
    >
      vanta<span className={styles.dot}>.</span>
    </span>
  );
}

// Full-screen loading state for client-facing pages.
export default function BrandLoader({ label = 'Loading' }) {
  return (
    <div className={`booking-page ${styles.screen}`} role="status" aria-label={label}>
      <span className={styles.wordmark} style={{ fontSize: 34, letterSpacing: -2 }} aria-hidden="true">
        vanta<span className={`${styles.dot} ${styles.pulse}`}>.</span>
      </span>
      <span className={styles.track} aria-hidden="true"><span className={styles.bar} /></span>
    </div>
  );
}
