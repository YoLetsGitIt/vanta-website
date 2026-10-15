'use client';

import { useEffect, useState } from 'react';
import { startWebsiteSignIn } from '../lib/website-auth';

export default function SocialSignIn({ consentAccepted = false, requireConsent = false, disabled = false }) {
  const [pending, setPending] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { if (consentAccepted) setError(''); }, [consentAccepted]);

  async function signIn(provider) {
    setError('');
    if (requireConsent && !consentAccepted) { setError('Please agree to the Terms of Use and Privacy Policy above.'); return; }
    setPending(provider);
    try { await startWebsiteSignIn(provider, consentAccepted); }
    catch (error) { setError(error.message || 'Unable to start sign-in. Please try again.'); setPending(null); }
  }

  return <div style={{ display: 'grid', gap: 12, marginTop: 24 }}>
    <p style={{ color: '#aeb5c0', fontSize: 13, textAlign: 'center', margin: '0 0 2px' }}>or continue with</p>
    {['apple', 'google'].map(provider => <button key={provider} type="button" onClick={() => signIn(provider)} disabled={disabled || Boolean(pending)} style={{ minHeight: 48, width: '100%', border: '1px solid #d9dce1', borderRadius: 12, background: '#fff', color: '#1f1f1f', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, fontSize: 15, fontWeight: 600, cursor: pending ? 'wait' : 'pointer', opacity: disabled || pending && pending !== provider ? 0.6 : 1 }}>
      {provider === 'apple' ? <svg width="20" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.1 12.4c0-2 1.6-3 1.7-3.1-1-1.4-2.5-1.6-3-1.6-1.3-.1-2.5.8-3.1.8-.7 0-1.7-.8-2.8-.8-1.5 0-2.9.9-3.7 2.2-1.6 2.7-.4 6.8 1.1 9 .8 1.1 1.6 2.3 2.8 2.2 1.1 0 1.6-.7 3-.7s1.9.7 3.1.7c1.3 0 2-1.1 2.7-2.2.9-1.3 1.2-2.6 1.2-2.7-.1 0-3-1.1-3-3.8ZM15 6.3c.6-.8 1.1-1.9 1-3-.9 0-2 .6-2.7 1.4-.6.7-1.1 1.8-1 2.9 1 .1 2.1-.5 2.7-1.3Z"/></svg>
        : <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.2h6.7c3.9-3.6 6-8.9 6-15.1Z"/><path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.7-5.2c-1.8 1.2-4.1 1.9-6.8 1.9-5.3 0-9.8-3.6-11.4-8.4H5.7v5.3A20.4 20.4 0 0 0 24 44Z"/><path fill="#FBBC05" d="M12.6 27.4a12 12 0 0 1 0-7.7v-5.3H5.7a20 20 0 0 0 0 18.3l6.9-5.3Z"/><path fill="#EA4335" d="M24 11.3c3 0 5.6 1 7.7 3l5.8-5.8A19.5 19.5 0 0 0 24 3a20.4 20.4 0 0 0-18.3 11.4l6.9 5.3c1.6-4.8 6.1-8.4 11.4-8.4Z"/></svg>}
      {pending === provider ? 'Connecting…' : `Continue with ${provider === 'apple' ? 'Apple' : 'Google'}`}
    </button>)}
    {error && <p role="alert" style={{ color: '#ff9696', fontSize: 13, lineHeight: 1.5, margin: 0 }}>{error}</p>}
  </div>;
}
