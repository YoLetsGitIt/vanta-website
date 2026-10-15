# Website account creation with Apple and Google

Website account creation is available at `/signup`. Apple and Google also appear
on artist booking requests, Studio booking selection and proposal confirmation.
Existing password and email-code methods remain available.

The shared Supabase browser client uses PKCE. `/auth/callback` restores the
session, checks or creates the backend profile, and returns the client to the
original booking URL, including its query parameters. Return destinations are
restricted to Vanta account and booking paths. New profiles require accepted
terms; an existing profile is never recreated following a lookup/network error.
Profile creation does not overwrite existing artist account roles.

A provider authorization preflight leaves the email option usable if a provider
is enabled for native identity tokens but has no web OAuth secret. No provider
secret is included in the frontend. Browser sign-in is only operational once
the provider credentials and redirect allowlist are configured.

## Supabase configuration

Project: `aznxvdnpvbcofaqxgmtu`.

- Google: configure a Web application OAuth client ID and secret. Keep existing
  mobile IDs and put the web client first. Google needs the website origins
  `https://www.vanta.tattoo` and `https://vanta.tattoo`.
- Apple: configure the web Services ID and generated client secret. Put the
  Services ID first and keep native bundle IDs in the accepted client ID list.
  Apple web secrets need rotation at least every six months.
- Both providers use Supabase's callback:
  `https://aznxvdnpvbcofaqxgmtu.supabase.co/auth/v1/callback`.
- Supabase's allowed website redirects must include
  `https://www.vanta.tattoo/auth/callback` and
  `https://vanta.tattoo/auth/callback`, while retaining existing mobile redirects.

References: [Google configuration](https://supabase.com/docs/guides/auth/social-login/auth-google),
[Apple configuration](https://supabase.com/docs/guides/auth/social-login/auth-apple),
[redirect allowlist](https://supabase.com/docs/guides/auth/redirect-urls).

## Verification

`scripts/website-social-auth-smoke.cjs` tests signup, PKCE code exchange, new
profile/terms handling, return to booking requests and proposals, provider
unavailability, cancellation and profile lookup failure. All identity and backend
calls are mocked. `scripts/artist-booking-workflow-smoke.cjs` covers client time
acceptance and consent signing. Run these against a built local static preview
with `VANTA_BOOKING_TEST_URL`, `VANTA_PLAYWRIGHT_PATH` and `VANTA_CHROMIUM_PATH`.

Real provider account sign-in still requires a user-controlled Apple/Google
account; automated checks do not enter personal credentials or create live users.
