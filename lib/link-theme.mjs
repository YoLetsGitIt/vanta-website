// Pages a client or artist reaches from a link (booking forms, deposit and time links,
// consent, short links, account emails) open in the light theme. The marketing pages
// keep their dark look.

const LINK_PATHS = /^\/(?:(?:b|c|a|w|j)\/|(?:booking|bookings|consent|auth|join|signup|reset-password|email-changed|artist\/account)(?:\/|\.html|$))/;

export function isLinkPage(hostname, pathname) {
  const host = String(hostname || '').toLowerCase();
  // An artist's own booking address (matthew.vanta.tattoo) is a booking form.
  if (host.endsWith('.vanta.tattoo') && host !== 'www.vanta.tattoo') return true;
  return LINK_PATHS.test(String(pathname || ''));
}

export function applyLinkTheme(root, hostname, pathname) {
  if (isLinkPage(hostname, pathname)) root.setAttribute('data-link-theme', 'light');
  else root.removeAttribute('data-link-theme');
}

// Runs in <head> before the page paints, so link pages never flash dark.
export const LINK_THEME_SCRIPT = `(function(){try{var h=location.hostname.toLowerCase();var l=(/\\.vanta\\.tattoo$/.test(h)&&h!=='www.vanta.tattoo')||${LINK_PATHS.toString()}.test(location.pathname);if(l)document.documentElement.setAttribute('data-link-theme','light');}catch(e){}}());`;
