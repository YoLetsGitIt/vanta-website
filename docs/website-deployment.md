# Website releases

The artists page, public product walkthroughs, theme-specific app captures, header wordmark and opening animation are application source in this repository. Keep them committed on `main` so booking and authentication releases retain the public website design.

Deploy from an up-to-date checkout after committing and pushing source changes:

```sh
git pull --ff-only origin main
npm ci
npm run deploy
```

The deployment preflight rejects uncommitted application files and any checkout whose HEAD differs from `origin/main`. Generated files in `out/` are excluded from that check because the build regenerates them. Do not publish an old export or copy an older source snapshot over `main`.

`npm run build` uses the committed walkthrough snapshot when the sibling `vanta-studio` repository is absent, then prepares directory indexes for public and booking routes. The opening animation lives in the website root layout, plays once per session, respects reduced motion, and excludes `studio.vanta.tattoo`.

Vanta Studio is deployed separately. Changes to `studio.vanta.tattoo` are not published by this repository.
