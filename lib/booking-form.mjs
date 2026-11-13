// The questions on an artist's own booking form (Settings > Your forms in the app).
// Matches DefaultArtistBookingForm on the backend: what the link asked before.
// The same questions as a studio's form (but artist preference), plus colour.
export const DEFAULT_ARTIST_FORM = {
  design_details: { enabled: true, required: true },
  body_location: { enabled: true, required: true },
  size: { enabled: false, required: false },
  skin_tone: { enabled: false, required: false },
  image_paths: { enabled: true, required: true },
  color: { enabled: true, required: true },
  notes: { enabled: true, required: false },
  allergies: { enabled: false, required: false },
  availability_windows: { enabled: true, required: true },
  address: { enabled: false, required: false },
};

// Questions a studio on Vanta Studio can switch on for its own booking form.
const STUDIO_QUESTIONS = new Set(['allergies', 'address']);

function entry(value) {
  return { enabled: Boolean(value?.enabled), required: Boolean(value?.enabled && value?.required) };
}

// Whether a question is asked, and whether it must be answered. The artist's form
// decides, and a studio the booking goes to adds what it requires.
export function formQuestion(artistForm, studioForm, key) {
  const artist = key in DEFAULT_ARTIST_FORM
    ? entry({ ...DEFAULT_ARTIST_FORM[key], ...(artistForm?.[key] || {}) })
    : { enabled: false, required: false };
  const studio = entry(studioForm?.[key]);
  const asked = artist.enabled || (STUDIO_QUESTIONS.has(key) ? studio.enabled : studio.required);
  return { asked, required: asked && (artist.required || studio.required) };
}

// A preview of unsaved choices from the app (Settings > Booking form > Preview on web):
// ?preview_form=<base64url JSON of { key: { enabled, required } }>. Only known questions
// are kept; anything unreadable means no preview.
export function parsePreviewForm(raw) {
  if (!raw || raw.length > 4000) return null;
  try {
    const base64 = raw.replace(/-/g, '+').replace(/_/g, '/');
    const json = typeof atob === 'function' ? atob(base64) : Buffer.from(base64, 'base64').toString('binary');
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const form = {};
    for (const key of Object.keys(DEFAULT_ARTIST_FORM)) {
      if (parsed[key] && typeof parsed[key] === 'object') form[key] = entry(parsed[key]);
    }
    return Object.keys(form).length ? form : null;
  } catch {
    return null;
  }
}
