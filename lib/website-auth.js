import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://aznxvdnpvbcofaqxgmtu.supabase.co';
export const SUPABASE_PUBLIC_KEY = 'sb_publishable_SrxxKBifFjEUF8Is9ipQwQ_HVvvLPn_';
export const BACKEND_URL = 'https://inkspire-backend-xa2a.onrender.com';
const pendingKey = 'vanta.website.oauth';
let client;

export function websiteAuth() {
  client ||= createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, { auth: { flowType: 'pkce', detectSessionInUrl: true } });
  return client;
}

export function safeAuthReturn(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/signup';
  const parsed = new URL(value, 'https://www.vanta.tattoo');
  if (parsed.origin !== 'https://www.vanta.tattoo' || !/^\/(signup|bookings|booking|artist)(\/|$)/.test(parsed.pathname)) return '/signup';
  return parsed.pathname + parsed.search;
}

export function pendingWebsiteSignIn() {
  try {
    const data = JSON.parse(sessionStorage.getItem(pendingKey));
    if (!data || !Number.isFinite(data.createdAt) || Date.now() - data.createdAt > 30 * 60 * 1000) return null;
    return { ...data, returnTo: safeAuthReturn(data.returnTo) };
  } catch { return null; }
}

export function clearWebsiteSignIn() { sessionStorage.removeItem(pendingKey); }

export function rememberWebsiteSignIn(termsAccepted) {
  const pending = { returnTo: safeAuthReturn(location.pathname + location.search), termsAccepted: Boolean(termsAccepted), createdAt: Date.now() };
  sessionStorage.setItem(pendingKey, JSON.stringify(pending));
}

export async function startWebsiteSignIn(provider, termsAccepted) {
  if (!['apple', 'google'].includes(provider)) throw new Error('Unsupported sign-in option.');
  rememberWebsiteSignIn(termsAccepted);
  const { data, error } = await websiteAuth().auth.signInWithOAuth({ provider, options: { redirectTo: location.origin + '/auth/callback', skipBrowserRedirect: true } });
  if (error || !data.url) throw new Error('Unable to start sign-in. Please try again.');
  // A configured native identity provider can still lack its web OAuth secret.
  // Check before navigation so a configuration failure leaves email sign-in usable.
  const response = await fetch(data.url, { redirect: 'manual', headers: { apikey: SUPABASE_PUBLIC_KEY } });
  if (response.type !== 'opaqueredirect' && !(response.ok || response.status >= 300 && response.status < 400)) {
    throw new Error(`${provider === 'apple' ? 'Apple' : 'Google'} sign-in is temporarily unavailable. Please use email or try again later.`);
  }
  location.assign(data.url);
}

export async function ensureWebsiteProfile(session, termsAccepted) {
  const headers = { Authorization: `Bearer ${session.access_token}` };
  const existing = await fetch(`${BACKEND_URL}/auth/users/me`, { headers, cache: 'no-store' });
  if (existing.ok) return existing.json();
  if (existing.status !== 404) throw new Error('Unable to load your Vanta account. Please try again.');
  if (!termsAccepted) {
    const error = new Error('Please agree to the Terms of Use and Privacy Policy to create your account.');
    error.needsTerms = true;
    throw error;
  }
  const metadata = session.user?.user_metadata || {};
  const response = await fetch(`${BACKEND_URL}/auth/users/me`, {
    method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: metadata.full_name || metadata.name || '', accountType: 'user', termsAcceptedVersion: '1.0' }),
  });
  if (!response.ok) throw new Error('Unable to finish creating your Vanta account. Please try again.');
  return response.json();
}
