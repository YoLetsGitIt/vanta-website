'use client';

import { useEffect, useState } from 'react';
import styles from './page.module.css';
import { returnMessage } from '../../../lib/artist-return.mjs';

// Where artists land after Stripe (setting up or managing Vanta Pro) or connecting a
// mailbox from the Vanta app. Everything is managed in the app, so there's no sign-in
// here: just what happened and a way back. Settings → Vanta Pro in the app shows the
// up-to-date plan.
const APP_STORE = 'https://apps.apple.com/au/app/vanta-find-your-next-tattoo/id6760996738';

export default function ArtistAccount() {
  const [message, setMessage] = useState(null);
  useEffect(() => { setMessage(returnMessage(new URLSearchParams(window.location.search))); }, []);
  if (!message) return <main className={styles.page} />;
  const [title, body] = message;
  return (
    <main className={styles.page}>
      <div className={styles.content}>
        <p className={styles.brand}>vanta.</p>
        <h1>{title}</h1>
        <p className={styles.body}>{body}</p>
        <a className={styles.appButton} href="vanta://">Open Vanta</a>
        <p className={styles.help}>Don’t have the app on this device? <a href={APP_STORE}>Get Vanta for iPhone</a></p>
      </div>
    </main>
  );
}
