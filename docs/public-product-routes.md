# Public product routes

The public website owns product marketing. The studio app owns authentication, checkout and the dashboard.

| Route | Purpose |
| --- | --- |
| `https://vanta.tattoo/` | Tattoo discovery; short artist and studio invitations |
| `/artists` | Artist walkthrough, phone previews and artist feature catalogue; app download |
| `/studio` | Owner walkthrough and studio feature catalogue; studio trial |
| `/pricing` | Studio subscription, trial terms and deposit fee disclosure |
| `/studios` | Legacy redirect to `/studio`, preserving query/hash |
| `https://studio.vanta.tattoo/` | Sign in, including existing-session dashboard routing |
| Studio `/signup/`, `/signin/` | Dedicated account routes |
| Studio `/features#pricing` | Legacy redirect to public `/pricing` |
| Studio `/features` | Legacy redirect to public `/studio` |

Legacy studio `/?signup`, `/?signin`, and Stripe completion parameters remain supported. Customer booking and consent routes have not moved. The app's brand link returns to the public homepage; “Back to studio” returns to the public owner walkthrough.

## Shared walkthrough

The editable walkthrough and product catalogue remain in `vanta-studio/components/studio-cinematic` and its existing catalogue/demo dependencies. `npm run sync:walkthrough` refreshes the generated snapshot under `components/walkthrough` and its public assets. Do not hand-edit the snapshot.

`npm run build` runs this sync automatically when the sibling studio source repository is present. With only this repository available, it builds from the saved snapshot, so hosting does not require access to the app repository. Include the snapshot and its assets with website changes. Both artist and owner routes use the same component with an explicit audience; neither presents the audience selector. The studio app's `/design/studio-walkthrough.html` remains a development preview with the selector.

The postbuild script creates static directory indexes for product routes. This matters for `/studio/`, whose path also contains the walkthrough media.

## Local preview

Build the studio app with `NEXT_PUBLIC_MARKETING_URL=http://localhost:4174 npm run build` and serve it with `python3 scripts/serve-preview.py --port 4173` from the studio repository.

Build this website with `NEXT_PUBLIC_STUDIO_URL=http://localhost:4173 npm run build` and serve it with `python3 scripts/serve-preview.py --port 4174`.

Run `STUDIO_PLAYWRIGHT_PATH=/path/to/playwright node scripts/product-routing-smoke.cjs`. It checks desktop/mobile, animation/reduced motion, audience routes, demos, pricing, signup handoff, return links and legacy redirects. External services are mocked; it creates no accounts or payments.

## Release

No deployment is performed by the preview work. Before publishing, rebuild without the localhost overrides (production defaults are `https://vanta.tattoo` and `https://studio.vanta.tattoo`). Publish the public website first so `/studio`, `/artists` and `/pricing` exist, then publish the studio app with its return links and redirects. Keep the existing domain/DNS configuration and booking/checkout URLs.
