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

`<name>` is the name in lower case with spaces and punctuation removed. A new name means a new
app id, which installs as a separate desktop app with its own data; set `desktop.appId` and
`desktop.executableName` explicitly once you ship, so a later rename keeps existing installs.

Links you may want under `replace` once you host your own: `https://app.rakazo.com` (the desktop
setup's hosted option), `https://rakazo.com/terms/` and `https://rakazo.com/privacy/` (shown at
sign-up and in the mobile paywall), the docs links under `https://rakazo.com/docs/`, and
`https://github.com/elie222/rakazo` (the "star us" prompt and the self-host help link).
