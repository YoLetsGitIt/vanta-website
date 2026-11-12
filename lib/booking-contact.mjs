// Contact details on the booking form: first and last name, email and a phone number
// with its country code. Saved as one name ("Jane Smith") and one phone ("+61 412 345 678").

// Australia first (most clients), then nearby and common countries.
export const COUNTRIES = [
  { code: 'AU', dial: '+61', name: 'Australia', digits: [9, 9] },
  { code: 'NZ', dial: '+64', name: 'New Zealand', digits: [8, 10] },
  { code: 'US', dial: '+1', name: 'United States / Canada', digits: [10, 10] },
  { code: 'GB', dial: '+44', name: 'United Kingdom', digits: [10, 10] },
  { code: 'IE', dial: '+353', name: 'Ireland', digits: [9, 9] },
  { code: 'SG', dial: '+65', name: 'Singapore', digits: [8, 8] },
  { code: 'JP', dial: '+81', name: 'Japan', digits: [9, 10] },
  { code: 'KR', dial: '+82', name: 'South Korea', digits: [9, 10] },
  { code: 'CN', dial: '+86', name: 'China', digits: [11, 11] },
  { code: 'HK', dial: '+852', name: 'Hong Kong', digits: [8, 8] },
  { code: 'IN', dial: '+91', name: 'India', digits: [10, 10] },
  { code: 'PH', dial: '+63', name: 'Philippines', digits: [10, 10] },
  { code: 'ID', dial: '+62', name: 'Indonesia', digits: [9, 12] },
  { code: 'TH', dial: '+66', name: 'Thailand', digits: [9, 9] },
  { code: 'MY', dial: '+60', name: 'Malaysia', digits: [9, 10] },
  { code: 'VN', dial: '+84', name: 'Vietnam', digits: [9, 10] },
  { code: 'DE', dial: '+49', name: 'Germany', digits: [10, 11] },
  { code: 'FR', dial: '+33', name: 'France', digits: [9, 9] },
  { code: 'IT', dial: '+39', name: 'Italy', digits: [9, 10] },
  { code: 'ES', dial: '+34', name: 'Spain', digits: [9, 9] },
  { code: 'NL', dial: '+31', name: 'Netherlands', digits: [9, 9] },
  { code: 'ZA', dial: '+27', name: 'South Africa', digits: [9, 9] },
  { code: 'BR', dial: '+55', name: 'Brazil', digits: [10, 11] },
  { code: 'MX', dial: '+52', name: 'Mexico', digits: [10, 10] },
];

export const DEFAULT_COUNTRY = 'AU';

const country = code => COUNTRIES.find(c => c.code === code) || COUNTRIES[0];

// The number without its country code: digits only, with no leading 0 (trunk prefix).
export function nationalDigits(number) {
  return String(number || '').replace(/\D/g, '').replace(/^0+/, '');
}

// A phone number is valid when it has the usual number of digits for that country.
export function validPhone(code, number) {
  const digits = nationalDigits(number);
  const [min, max] = country(code).digits;
  return digits.length >= min && digits.length <= max;
}

// "+61 412 345 678" from the country and what the client typed ("0412 345 678").
export function fullPhone(code, number) {
  const digits = nationalDigits(number);
  if (!digits) return '';
  const groups = digits.length > 6 ? [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6)] : [digits];
  return `${country(code).dial} ${groups.join(' ')}`;
}

// Splits a saved phone back into country and number. Without a + it's taken as a local
// number in the default country.
export function splitPhone(value, fallback = DEFAULT_COUNTRY) {
  const raw = String(value || '').trim();
  if (!raw.startsWith('+')) return { code: fallback, number: raw };
  const compact = raw.replace(/[^\d+]/g, '');
  // Longest dial code first, so +852 isn't read as +85…
  const match = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length).find(c => compact.startsWith(c.dial));
  if (!match) return { code: fallback, number: raw };
  return { code: match.code, number: compact.slice(match.dial.length) };
}

export function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email || '').trim());
}

// "Jane Smith" → first "Jane", last "Smith"; everything after the first word is the last name.
export function splitName(full) {
  const words = String(full || '').trim().split(/\s+/).filter(Boolean);
  return { first: words[0] || '', last: words.slice(1).join(' ') };
}

export function joinName(first, last) {
  return `${String(first || '').trim()} ${String(last || '').trim()}`.trim();
}
