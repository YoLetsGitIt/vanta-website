'use client';

import { useEffect, useState } from 'react';
import SocialSignIn from '../../../components/SocialSignIn';
import { BACKEND_URL, websiteAuth } from '../../../lib/website-auth';
import styles from '../account/page.module.css';

const APP_STORE_URL = 'https://apps.apple.com/au/app/vanta-find-your-next-tattoo/id6760996738';
const PLAY_URL = 'https://play.google.com/store/apps/details?id=vanta.tattoo';

// Phones get a button that opens the invite in the Vanta app. Android falls back to Play.
function appLink(code, platform) {
  if (platform === 'android') return `intent://join/${code}#Intent;scheme=vanta;package=vanta.tattoo;S.browser_fallback_url=${encodeURIComponent(PLAY_URL)};end`;
  return `vanta://join/${code}`;
}

// vanta.tattoo/j/<code> lands here: an artist signs in and joins the studio in one tap.
export default function JoinStudio() {
  const [code, setCode] = useState('');
  const [studio, setStudio] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [session, setSession] = useState(undefined);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [joined, setJoined] = useState(null);
  const [platform, setPlatform] = useState('');

  useEffect(() => {
    const value = (new URLSearchParams(location.search).get('code') || '').trim().toLowerCase();
    setCode(value);
    const ua = navigator.userAgent || '';
    setPlatform(/android/i.test(ua) ? 'android' : (/iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) ? 'ios' : '');
    if (!/^[a-z0-9]{6,20}$/.test(value)) { setLoadError('This invite link is incomplete. Ask the studio to send it again.'); return; }
    fetch(`${BACKEND_URL}/studio-invites/${encodeURIComponent(value)}`, { cache: 'no-store' })
      .then(async res => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(res.status === 404 ? 'This invite link is no longer valid. Ask the studio for a new one.' : 'Couldn’t open this invite. Please refresh to try again.');
        setStudio(data);
      })
      .catch(e => setLoadError(e.message));
    let live = true;
    websiteAuth().auth.getSession().then(({ data }) => { if (live) setSession(data.session); });
    const { data } = websiteAuth().auth.onAuthStateChange((_event, value) => { if (live) setSession(value); });
    return () => { live = false; data.subscription.unsubscribe(); };
  }, []);

  async function run(name, work) {
    setBusy(name); setError('');
    try { await work(); } catch (e) { setError(e.message); } finally { setBusy(''); }
  }

  async function login(event) {
    event.preventDefault();
    await run('login', async () => {
      const result = await websiteAuth().auth.signInWithPassword({ email, password });
      if (result.error) throw new Error('That email and password didn’t match. Use the same details as the Vanta app.');
      setSession(result.data.session);
    });
  }

  async function join() {
    await run('join', async () => {
      const { data } = await websiteAuth().auth.getSession();
      if (!data.session) throw new Error('Please sign in again.');
      const res = await fetch(`${BACKEND_URL}/studio-invites/${encodeURIComponent(code)}/accept`, {
        method: 'POST', cache: 'no-store', headers: { Authorization: `Bearer ${data.session.access_token}` },
      });
      const result = await res.json().catch(() => ({}));
      if (res.status === 403) throw new Error('This account isn’t an artist account yet. Switch to an artist account in the Vanta app, then open this link again.');
      if (res.status === 404) throw new Error('This invite link is no longer valid. Ask the studio for a new one.');
      if (!res.ok) throw new Error(result.error || 'Couldn’t join the studio. Please try again.');
      setJoined(result);
    });
  }

  const name = studio?.studio_name || 'the studio';
  return <main className={styles.page}><div className={styles.content}>
    <a href="/" className={styles.back}>← Vanta</a>
    <h1>{studio ? `Join ${name}` : 'Studio invite'}</h1>
    {studio && <p className={styles.intro}>{name} invited you to join them on Vanta. Joining connects your artist account, so the studio can see your schedule and book clients with you.{studio.address ? <><br />{studio.address}</> : null}</p>}
    {loadError && <p role="alert" className={styles.error}>{loadError}</p>}
    {error && <p role="alert" className={styles.error}>{error}</p>}
    {!studio && !loadError && <p role="status">Loading…</p>}

    {studio && joined && <section className={styles.card}>
      <h2>{joined.already_connected ? `You’re already with ${name}` : `You’ve joined ${name}`}</h2>
      <p>Open the Vanta app to see the studio in your profile. Check your work schedule so bookings land on the right days.</p>
    </section>}

    {studio && !joined && platform && <section className={styles.card}>
      <h2>Join in the app</h2>
      <p>Open this invite in the Vanta app and tap Join.</p>
      <a className={styles.appButton} href={appLink(code, platform)}>Open in the Vanta app</a>
      <p className={styles.help}>Don’t have it yet? <a href={platform === 'android' ? PLAY_URL : APP_STORE_URL} style={{ color: '#fff' }}>Get Vanta</a>, create your artist account, then open this link again. Or sign in below.</p>
    </section>}

    {studio && !joined && session === null && <section className={styles.card}>
      <h2>{platform ? 'Or join here' : 'Sign in to your artist account'}</h2>
      <form onSubmit={login} className={styles.form}>
        <label>Email<input type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required /></label>
        <label>Password<input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required /></label>
        <button disabled={Boolean(busy)}>{busy === 'login' ? 'Signing in…' : 'Sign in'}</button>
      </form>
      <SocialSignIn disabled={Boolean(busy)} />
      <p className={styles.help}>Use the same account as the Vanta app. No artist account yet? <a href={APP_STORE_URL} style={{ color: '#fff' }}>Get the Vanta app</a>, create an artist account, then open this link again.</p>
    </section>}

    {studio && !joined && session && <section className={styles.card}>
      <div className={styles.session}><span>Signed in as {session.user?.email}</span><button disabled={Boolean(busy)} onClick={() => run('logout', () => websiteAuth().auth.signOut())}>Not you?</button></div>
      <p>Join {name} with this account?</p>
      <button disabled={Boolean(busy)} onClick={join}>{busy === 'join' ? 'Joining…' : `Join ${name}`}</button>
    </section>}
  </div></main>;
}
