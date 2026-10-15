'use client';

import { useEffect, useState } from 'react';
import { websiteAuth, pendingWebsiteSignIn, clearWebsiteSignIn, ensureWebsiteProfile } from '../../../lib/website-auth';

export default function WebsiteAuthCallback() {
  const [error, setError] = useState('');
  const [needsTerms, setNeedsTerms] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(true);

  async function finish(acceptTerms = false) {
    setBusy(true); setError('');
    try {
      const parameters = new URLSearchParams(location.search);
      if (parameters.has('error')) throw new Error('Sign-in was not completed. Please return and try again.');
      const pending = pendingWebsiteSignIn();
      const { data, error } = await websiteAuth().auth.getSession();
      if (error || !data.session) throw new Error('Your sign-in session could not be restored. Please try again.');
      await ensureWebsiteProfile(data.session, acceptTerms || pending?.termsAccepted);
      const destination = pending?.returnTo || '/signup';
      clearWebsiteSignIn();
      location.replace(destination);
    } catch (error) {
      setNeedsTerms(Boolean(error.needsTerms));
      setError(error.message || 'Unable to complete sign-in. Please try again.');
      setBusy(false);
    }
  }

  useEffect(() => { finish(); }, []);

  return <main style={{ height: '100dvh', overflow: 'auto', background: '#11151b', color: '#fff', padding: '64px 24px', boxSizing: 'border-box' }}>
    <div style={{ maxWidth: 440, margin: '0 auto' }}>
      <a href="/" style={{ color: '#bac1cb' }}>← Vanta</a>
      <h1 style={{ marginTop: 32 }}>{needsTerms ? 'Finish creating your account' : 'Signing you in'}</h1>
      {busy && <p role="status">Finishing your Vanta sign-in…</p>}
      {error && <p role="alert" style={{ lineHeight: 1.6 }}>{error}</p>}
      {needsTerms && <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, lineHeight: 1.6, margin: '24px 0' }}><input type="checkbox" style={{ width: 18, minWidth: 18, maxWidth: 18, height: 18, flex: '0 0 18px', marginTop: 4, padding: 0 }} checked={accepted} onChange={e => setAccepted(e.target.checked)} /><span>I agree to the <a href="/terms" style={{ color: '#fff' }}>Terms of Use</a> and <a href="/privacy" style={{ color: '#fff' }}>Privacy Policy</a>.</span></label>}
      {!busy && <button disabled={needsTerms && !accepted} onClick={() => finish(accepted)} style={{ minHeight: 48, padding: '12px 24px', borderRadius: 12, fontWeight: 600 }}>{needsTerms ? 'Create account' : 'Try again'}</button>}
      {!busy && <p><a href="/signup" style={{ color: '#fff' }}>Back to sign-in</a></p>}
    </div>
  </main>;
}
