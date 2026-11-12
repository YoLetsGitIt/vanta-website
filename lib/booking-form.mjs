// The questions on an artist's own booking form (Settings > Your forms in the app).
// Matches DefaultArtistBookingForm on the backend: what the link asked before.
export const DEFAULT_ARTIST_FORM = {
  image_paths: { enabled: true, required: true },
  color: { enabled: true, required: true },
  notes: { enabled: true, required: false },
  allergies: { enabled: false, required: false },
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
