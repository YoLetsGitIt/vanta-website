// What the artist sees on vanta.tattoo/artist/account after Stripe (setting up or managing
// Vanta Pro) or connecting a mailbox from the Vanta app: [title, body].
const MAILBOX = {
  connected: ['Mailbox connected', 'Client emails can now come from your own address.'],
  cancelled: ['Mailbox not connected', 'You cancelled before connecting. Nothing has changed.'],
  access_expired: ['Mailbox not connected', 'Vanta Pro has ended, so a mailbox can’t be connected.'],
  unavailable: ['Mailbox not connected', 'Mailbox connections aren’t available right now. Please try again later.'],
};

export function returnMessage(params) {
  const checkout = params.get('checkout');
  const mailbox = params.get('mailbox');
  if (checkout === 'success') return ['You’re subscribed to Vanta Pro', 'Go back to the Vanta app. Pro turns on as soon as your payment is confirmed, usually within a minute.'];
  if (checkout === 'cancelled') return ['No subscription was set up', 'You haven’t been charged. You can set up Vanta Pro any time in the Vanta app.'];
  if (params.get('portal') === 'done') return ['Your plan is up to date', 'Go back to the Vanta app to see your Vanta Pro plan.'];
  if (mailbox) return MAILBOX[mailbox] || ['Mailbox not connected', 'Something went wrong connecting your mailbox. Go back to the Vanta app and try again.'];
  return ['Vanta Pro is in the app', 'Set up and manage Vanta Pro in the Vanta app, under Settings → Vanta Pro.'];
}
