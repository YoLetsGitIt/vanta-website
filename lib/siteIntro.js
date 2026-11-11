// Shared by the site-wide typewriter intro and pages whose entrance motion
// should wait for it, so that motion isn't spent behind the overlay.
export const INTRO_SEEN_KEY = 'vanta-intro-seen';
export const INTRO_EXIT_EVENT = 'vanta:intro-exit';

export function introWillPlay() {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname.toLowerCase();
  // Only vanta.tattoo itself: not the Studio app or an artist's booking address
  // (matthew.vanta.tattoo), where clients come to book.
  if (host.endsWith('.vanta.tattoo') && host !== 'www.vanta.tattoo') return false;
  // Clients opening a booking, consent or short link, and artists opening a
  // studio invite, go straight to their task.
  if (/^\/(b|c|a|w|j)\/|^\/(booking|bookings|consent|auth)(\/|$)/.test(window.location.pathname)) return false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  if (document.documentElement.dataset.siteIntro === 'done') return false;
  try {
    return sessionStorage.getItem(INTRO_SEEN_KEY) !== 'true';
  } catch {
    return true;
  }
}

// Runs `start` as the intro begins to fade out, or straight away if no intro
// is playing. Returns a cleanup function.
export function afterSiteIntro(start) {
  if (!introWillPlay()) {
    start();
    return () => {};
  }
  let started = false;
  const run = () => {
    if (started) return;
    started = true;
    window.removeEventListener(INTRO_EXIT_EVENT, run);
    window.clearTimeout(fallback);
    start();
  };
  window.addEventListener(INTRO_EXIT_EVENT, run);
  // Never hold the page back if the intro fails to report its exit.
  const fallback = window.setTimeout(run, 8000);
  return () => {
    window.removeEventListener(INTRO_EXIT_EVENT, run);
    window.clearTimeout(fallback);
  };
}
