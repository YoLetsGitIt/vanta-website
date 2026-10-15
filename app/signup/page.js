'use client';

import { useEffect, useState } from 'react';
import SocialSignIn from '../../components/SocialSignIn';
import { websiteAuth, ensureWebsiteProfile, rememberWebsiteSignIn } from '../../lib/website-auth';

const field = { display: 'block', width: '100%', minWidth: 0, boxSizing: 'border-box', minHeight: 48, padding: '12px 14px', border: '1px solid #4d5562', borderRadius: 12, background: '#1b222d', color: '#fff', fontSize: 16 };

export default function SignupPage() {
  const [mode, setMode] = useState('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [session, setSession] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(location.search).get('mode') === 'login') setMode('login');
    async function restore(value) {
      if (!value) { setSession(null); return; }
      try { await ensureWebsiteProfile(value, false); setSession(value); }
      catch (error) {
        if (error.needsTerms) location.assign('/auth/callback');
        else setError(error.message);
      }
    }
    websiteAuth().auth.getSession().then(({ data }) => restore(data.session));
    const { data } = websiteAuth().auth.onAuthStateChange((_event, value) => { setTimeout(() => restore(value), 0); });
    return () => data.subscription.unsubscribe();
  }, []);

  async function submit(event) {
    event.preventDefault(); setError('');
    if (mode === 'signup' && !accepted) { setError('Please agree to the Terms of Use and Privacy Policy.'); return; }
    setBusy(true);
    try {
      if (mode === 'signup') rememberWebsiteSignIn(accepted);
      const result = mode === 'signup'
        ? await websiteAuth().auth.signUp({ email, password, options: { data: { full_name: name }, emailRedirectTo: location.origin + '/auth/callback' } })
        : await websiteAuth().auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
      if (result.data.session) { await ensureWebsiteProfile(result.data.session, accepted); setSession(result.data.session); }
      else setConfirmEmail(true);
    } catch (error) { setError(error.message || 'Unable to sign in. Please try again.'); }
    finally { setBusy(false); }
  }

  return <main style={{ height: '100dvh', overflow: 'auto', boxSizing: 'border-box', background: '#11151b', color: '#fff', padding: '40px 24px 64px' }}>
    <div style={{ maxWidth: 440, margin: '0 auto' }}>
      <a href="/" style={{ color: '#bac1cb' }}>← Vanta</a>
      {session ? <>
        <h1 style={{ marginTop: 32 }}>You’re signed in</h1>
        <p style={{ lineHeight: 1.6 }}>Use your Vanta account to book with artists and keep your appointments together.</p>
        <p style={{ color: '#bac1cb', overflowWrap: 'anywhere' }}>{session.user?.email}</p>
        <p><a href="/artists" style={{ color: '#fff' }}>Explore Vanta for artists</a></p>
        <p><a href="https://apps.apple.com/au/app/vanta-find-your-next-tattoo/id6760996738" style={{ color: '#fff' }}>Get Vanta for iPhone</a></p>
        <button type="button" onClick={async () => { await websiteAuth().auth.signOut(); setSession(null); }} style={{ minHeight: 44, padding: '8px 16px', borderRadius: 10 }}>Sign out</button>
      </> : confirmEmail ? <>
        <h1 style={{ marginTop: 32 }}>Check your email</h1><p style={{ lineHeight: 1.6 }}>Confirm the email sent to {email}, then return to sign in.</p>
        <button type="button" onClick={() => { setConfirmEmail(false); setMode('login'); }} style={{ minHeight: 44, padding: '8px 16px', borderRadius: 10 }}>Back to sign-in</button>
      </> : <>
        <h1 style={{ marginTop: 32 }}>{mode === 'signup' ? 'Create your Vanta account' : 'Welcome back'}</h1>
        <p style={{ color: '#bac1cb', lineHeight: 1.6 }}>Book with your artist and manage your appointments.</p>
        <div style={{ display: 'flex', gap: 12, margin: '24px 0' }}>
          {['signup', 'login'].map(value => <button type="button" key={value} aria-pressed={mode === value} onClick={() => { setMode(value); setError(''); }} style={{ minHeight: 44, flex: 1, padding: 12, borderRadius: 12, border: '1px solid #515a69', background: mode === value ? '#fff' : 'transparent', color: mode === value ? '#11151b' : '#fff' }}>{value === 'signup' ? 'Create account' : 'Log in'}</button>)}
        </div>
        <form onSubmit={submit} style={{ display: 'grid', gap: 16 }}>
          {mode === 'signup' && <label>Name<input style={field} autoComplete="name" value={name} onChange={e => setName(e.target.value)} /></label>}
          <label>Email<input style={field} type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required /></label>
          <label>Password<input style={field} type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={e => setPassword(e.target.value)} required minLength={6} /></label>
          {mode === 'signup' && <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, lineHeight: 1.6 }}><input type="checkbox" style={{ width: 18, minWidth: 18, maxWidth: 18, height: 18, flex: '0 0 18px', marginTop: 4, padding: 0 }} checked={accepted} onChange={e => setAccepted(e.target.checked)} /><span>I agree to the <a href="/terms" style={{ color: '#fff' }}>Terms of Use</a> and <a href="/privacy" style={{ color: '#fff' }}>Privacy Policy</a>.</span></label>}
          {error && <p role="alert" style={{ color: '#ff9696', margin: 0 }}>{error}</p>}
          <button type="submit" disabled={busy} style={{ minHeight: 48, borderRadius: 12, fontSize: 15, fontWeight: 600, background: '#fff', color: '#11151b' }}>{busy ? 'Please wait…' : mode === 'signup' ? 'Create account with email' : 'Log in with email'}</button>
        </form>
        <SocialSignIn consentAccepted={accepted} requireConsent={mode === 'signup'} disabled={busy} />
      </>}
    </div>
  </main>;
}
