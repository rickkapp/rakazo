# Brands

This fork can ship under its own name. Each folder here is a brand; `brand.json` says what
changes. Applying one rewrites the working tree, so do it in the build (or on a release branch),
not on `main`: `main` stays close to upstream and merges cleanly.

```sh
pnpm brand:apply blueai          # rename the product in place
pnpm brand:apply blueai --check  # list files that still need it; exits 1 if any
```

Then build as usual (`pnpm build`, desktop `pnpm --filter @rakazo/desktop pack`, mobile EAS).
Applying is idempotent, so running it again after merging upstream picks up new strings.

## What changes

- Every place a person reads the product name: web, desktop and mobile UI, all translation
  catalogs, emails, the PWA manifest, page titles, OS permission prompts, notification text and
  the bots' own description of the product.
- Desktop: `productName`, app id, Linux executable name and its data folder, and the update feed,
  so a branded app never updates itself to an upstream build.
- Any exact strings listed under `replace` (applied first), for links you host yourself.

## What stays

Internal names that users never see and that other code or stored data depends on: package
names (`@rakazo/*`), environment variables (`RAKAZO_*`), database and storage keys, Docker
image names, `X-Rakazo-*` request headers, the `Rakazo/` user agent, the plugin registry id and
the compacted-history marker saved in conversations. The marketing site (`apps/www`), `docs/`,
the changelog and the license files are left alone; the Apache-2.0 `LICENSE` and `NOTICE` must
keep shipping with the product.

## brand.json

| Field                    | Meaning                                                                 |
| ------------------------ | ----------------------------------------------------------------------- |
| `name`                   | Product name shown to people. Letters, digits and spaces.              |
| `desktop.appId`          | macOS bundle id / Windows app id for the desktop app.                   |
| `desktop.executableName` | Linux executable, and the desktop app's data folder name.               |
| `desktop.updates`        | GitHub `owner` and `repo` whose releases the desktop app updates from.  |
| `replace`                | Exact `"from": "to"` strings, e.g. upstream URLs you host yourself.     |

Links you may want under `replace` once you host your own: `https://app.rakazo.com` (the desktop
setup's hosted option), `https://rakazo.com/terms/` and `https://rakazo.com/privacy/` (shown at
sign-up and in the mobile paywall), the docs links under `https://rakazo.com/docs/`, and
`https://github.com/elie222/rakazo` (the "star us" prompt and the self-host help link).
