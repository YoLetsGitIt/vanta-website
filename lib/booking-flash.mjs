// Booking a flash design from a shared link (?flash=<post id>), like "Book this flash" in the app.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isFlashReference(value) {
  return typeof value === 'string' && UUID.test(value.trim());
}

// What the page can do with a fetched post: attach it, or explain why not.
export function flashBookingState(post, artistId) {
  if (!post || post.work_type !== 'flash' || !artistId || String(post.artist_id).toLowerCase() !== String(artistId).toLowerCase()) {
    return { status: 'invalid' };
  }
  if (post.flash_claimed) return { status: 'claimed', post };
  if (post.flash_ended || (post.flash_ends_at && Date.parse(post.flash_ends_at) <= Date.now())) return { status: 'ended', post };
  return { status: 'ok', post };
}

export function flashNotice(state, artistName = 'this artist') {
  if (state.status === 'claimed') return `"${state.post.title}" is a one-off design and has already been booked. You can still request something else from ${artistName}.`;
  if (state.status === 'ended') return `"${state.post.title}" is no longer available. You can still request something else from ${artistName}.`;
  if (state.status === 'invalid') return 'That flash design couldn’t be found, so this is a regular booking request.';
  return '';
}

export function flashPriceLabel(post) {
  if (post?.price_from == null) return '';
  return post.price_to != null && post.price_to > post.price_from ? `$${post.price_from}–$${post.price_to}` : `$${post.price_from}`;
}

// The form starts from the flash's own details, like the app does.
export function flashPrefill(post) {
  const colour = post.colour_style === 'Color' || post.colour_style === 'Black & Grey' ? post.colour_style : '';
  return {
    designDetails: `Flash: ${post.title}`,
    bodyLocations: Array.isArray(post.body_part) ? post.body_part : [],
    colourStyle: colour,
    colourDetails: colour === 'Color' ? (post.colour_details || '') : '',
  };
}
