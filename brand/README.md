# Brand

This fork ships under its own name, set in `brand.json`. To rename the product, change
`"name"` and rebuild; nothing else needs to change.

```sh
pnpm brand:apply   # rename the product in place
pnpm brand:check   # list files that still need it; exits 1 if any
```

Apply it in the build (or on a release branch), on a checkout of `main`, then build as usual
(`pnpm build`, desktop `pnpm --filter @rakazo/desktop pack`, mobile EAS). `main` itself keeps the
upstream name so merges from upstream stay clean, and applying again after a merge picks up new
strings. Applying is idempotent; to switch to a different name, start from a fresh checkout.

## What changes

- Every place a person reads the product name: web, desktop and mobile UI, all translation
  catalogs, emails, the PWA manifest, page titles, OS permission prompts, notification text and
  the bots' own description of the product.
- Desktop: product name, app id, Linux executable name and its data folder, and the update feed,
  so a branded app never updates itself to an upstream build.
- Mobile: app name, iOS bundle id and Android package, the iOS app group and extension ids, the
  Expo slug, and the Expo project (see [Mobile builds](#mobile-builds)). The server's defaults
  for push and passkeys (`APNS_VOIP_BUNDLE_ID`, `APPLE_APP_IDS`) follow the bundle id.
- Any exact strings listed under `replace` (applied first), for links you host yourself.

## What stays

Internal names that users never see and that other code or stored data depends on: package
names (`@rakazo/*`), environment variables (`RAKAZO_*`), database and storage keys, Docker
image names, `X-Rakazo-*` request headers, the `Rakazo/` user agent, the plugin registry id and
the compacted-history marker saved in conversations. The marketing site (`apps/www`), `docs/`,
the changelog and the license files are left alone; the Apache-2.0 `LICENSE` and `NOTICE` must
keep shipping with the product.

## brand.json

| Field                    | Meaning                                                                   |
| ------------------------ | ------------------------------------------------------------------------- |
| `name`                   | Product name shown to people. Letters, digits and spaces.                 |
| `desktop.updates`        | GitHub `owner` and `repo` whose releases the desktop app updates from.    |
| `desktop.appId`          | Optional. macOS bundle id / Windows app id. Default: `ai.<name>.desktop`. |
| `desktop.executableName` | Optional. Linux executable and desktop data folder. Default: `<name>`.    |
| `replace`                | Optional. Exact `"from": "to"` strings, e.g. upstream URLs you host.      |

`<name>` is the name in lower case with spaces and punctuation removed. A new name means new
app ids, which install as separate apps with their own data and store listings; set
`desktop.appId`, `desktop.executableName` and `mobile.bundleId` explicitly once you ship, so a
later rename keeps existing installs.

## Mobile builds

A branded build never uses upstream's Expo project: its over-the-air updates would replace the
app's code and its push tokens belong to upstream. Until `mobile.expo` is set, applying removes
the project so you can link your own:

1. `pnpm brand:apply`, then in `apps/mobile`: `npx eas login` and `npx eas init`. Copy the
   `owner` and `projectId` it writes into `mobile.expo` in `brand.json` and commit that.
2. In the EAS `production` environment, set `EXPO_PUBLIC_API_URL` to your server's HTTPS origin
   (release builds refuse to start without it), and `GOOGLE_SERVICES_JSON` to the Firebase
   config for your Android package, which Android push needs.
3. `npx eas build --profile production` (or `preview` for internal testers). EAS creates the
   iOS bundle id, app group and extension ids in your Apple Developer account and signs them.
4. On your server, set `EXPO_ACCESS_TOKEN` from your Expo account if the project uses enhanced
   push security, and the `APNS_VOIP_*` keys for iOS call ringing and Live Activities
   (see `docs/self-host-clients.md`).
5. `npx eas submit` to send the build to App Store Connect and Google Play.

The `rakazo://` link scheme stays, because the server accepts it as the app's origin; it only
matters if the upstream app is installed on the same phone.

Links you may want under `replace` once you host your own: `https://app.rakazo.com` (the desktop
setup's hosted option), `https://rakazo.com/terms/` and `https://rakazo.com/privacy/` (shown at
sign-up and in the mobile paywall), the docs links under `https://rakazo.com/docs/`, and
`https://github.com/elie222/rakazo` (the "star us" prompt and the self-host help link).
