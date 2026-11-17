import assert from "node:assert/strict";
import { test } from "node:test";
import { rebrandDesktopPackage, rebrandMobileConfig, rebrandText, resolveBrand } from "./apply.mjs";

const brand = { name: "BlueAI" };

test("renames the product where people read it", () => {
  for (const [before, after] of [
    ["<Trans>Sign in to Rakazo</Trans>", "<Trans>Sign in to BlueAI</Trans>"],
    ['msgid "Rakazo"', 'msgid "BlueAI"'],
    ["Rakazo's catalog", "BlueAI's catalog"],
    ["Rakazo’s own peers", "BlueAI’s own peers"],
    ["Rakazo is up to date.", "BlueAI is up to date."],
    ["Rakazo-Server wechseln", "BlueAI-Server wechseln"],
    ["Rakazo'ya dön", "BlueAI'ya dön"],
    ["Rakazoの通話", "BlueAIの通話"],
    ["<title>Set up Rakazo</title>", "<title>Set up BlueAI</title>"],
    ["ברוכים הבאים ל-Rakazo", "ברוכים הבאים ל-BlueAI"],
    [
      "getByRole('radio', { name: /Rakazo Cloud/ })",
      "getByRole('radio', { name: /BlueAI Cloud/ })",
    ],
    ["/TOOLS\\.md\\s*Not used by Rakazo/,", "/TOOLS\\.md\\s*Not used by BlueAI/,"],
    ['findNamed(out, "Rakazo.app")', 'findNamed(out, "BlueAI.app")'],
    [
      '"/Applications/Rakazo.app/Contents/MacOS/Rakazo"',
      '"/Applications/BlueAI.app/Contents/MacOS/BlueAI"',
    ],
    ['prompt: "Use @Rakazo and @Interrogate"', 'prompt: "Use @BlueAI and @Interrogate"'],
  ]) {
    assert.equal(rebrandText(before, brand), after);
  }
});

test("keeps identifiers, paths, headers and user agents", () => {
  for (const kept of [
    'import { retry } from "@rakazo/core";',
    "RAKAZO_CLOUD_URL",
    "RakazoIntents.swift",
    "packages/ui-tokens/assets/Rakazo.icon",
    '"/project/ios/Rakazo/RakazoIntents.swift"',
    'repoIdentity("ssh://git@github.com/Elie222/Rakazo")',
    'request.headers.get("user-agent")?.startsWith("Rakazo/")',
    "expect(ua).toMatch(/^Rakazo\\//);",
    '{ id: "w-9", app_name: "Rakazo.exe", pid: 99 }',
    'getProjectName: () => "Rakazo",',
    "Rakazo-1.2.3.AppImage",
    'const USER_AGENT = "Rakazo/0.1 (+https://github.com/elie222/rakazo)";',
    'headers: { "X-Rakazo-Space-Id": id, label: "Rakazo" }',
    "`Rakazo-owned compacted context through message sequence 10.`",
    'const PLUGIN_REGISTRY = "Rakazo";',
  ]) {
    assert.equal(rebrandText(kept, brand), kept);
  }
});

test("applies exact replacements before the name", () => {
  const text = 'const RELEASES = "https://github.com/elie222/rakazo/releases/download";';
  const out = rebrandText(text, {
    ...brand,
    replace: { "https://github.com/elie222/rakazo/releases/download": "https://example.test/dl" },
  });
  assert.equal(out, 'const RELEASES = "https://example.test/dl";');
});

test("follows the desktop app id everywhere", () => {
  const out = rebrandText("<string>dev.rakazo.desktop.speech</string>", {
    ...brand,
    desktop: { appId: "ai.blueai.desktop" },
  });
  assert.equal(out, "<string>ai.blueai.desktop.speech</string>");
});

test("follows the mobile bundle id into its app group and extensions", () => {
  const mobile = { ...brand, mobile: { bundleId: "ai.blueai.app" } };
  for (const [before, after] of [
    ['"bundleIdentifier": "com.rakazo.app.widgets"', '"bundleIdentifier": "ai.blueai.app.widgets"'],
    [
      'export const IOS_SHARE_APP_GROUP = "group.com.rakazo.app";',
      'export const IOS_SHARE_APP_GROUP = "group.ai.blueai.app";',
    ],
    ["package com.rakazo.notifications", "package com.rakazo.notifications"],
  ]) {
    assert.equal(rebrandText(before, mobile), after);
  }
});

test("never ships upstream's Expo project", () => {
  const config = {
    expo: {
      name: "Rakazo",
      slug: "rakazo",
      owner: "upstream",
      extra: { router: {}, eas: { projectId: "upstream-id", build: { x: 1 } } },
      updates: { url: "https://u.expo.dev/upstream-id" },
    },
  };
  const unlinked = rebrandMobileConfig(config, resolveBrand(brand)).expo;
  assert.equal(unlinked.slug, "blueai");
  assert.equal(unlinked.owner, undefined);
  assert.deepEqual(unlinked.extra, { router: {}, eas: { build: { x: 1 } } });
  assert.deepEqual(unlinked.updates, {});

  const linked = rebrandMobileConfig(
    config,
    resolveBrand({ ...brand, mobile: { expo: { owner: "ours", projectId: "our-id" } } }),
  ).expo;
  assert.equal(linked.owner, "ours");
  assert.equal(linked.extra.eas.projectId, "our-id");
  assert.equal(linked.updates.url, "https://u.expo.dev/our-id");
  assert.equal(config.expo.owner, "upstream");
});

test("is idempotent", () => {
  const once = rebrandText("Welcome to Rakazo", brand);
  assert.equal(rebrandText(once, brand), once);
});

test("rewrites desktop names, ids and the update feed", () => {
  const pkg = {
    name: "@rakazo/desktop",
    productName: "Rakazo",
    author: { name: "Rakazo" },
    build: {
      appId: "dev.rakazo.desktop",
      extraMetadata: { name: "rakazo", main: "dist/main.js" },
      linux: { executableName: "rakazo", icon: "assets/icon.png" },
      publish: [{ provider: "github", owner: "elie222", repo: "rakazo" }],
    },
  };
  const out = rebrandDesktopPackage(pkg, {
    name: "BlueAI",
    desktop: {
      appId: "ai.blueai.desktop",
      executableName: "blueai",
      updates: { owner: "o", repo: "r" },
    },
  });
  assert.equal(out.name, "@rakazo/desktop");
  assert.equal(out.productName, "BlueAI");
  assert.equal(out.author.name, "BlueAI");
  assert.equal(out.build.appId, "ai.blueai.desktop");
  assert.deepEqual(out.build.extraMetadata, { name: "blueai", main: "dist/main.js" });
  assert.deepEqual(out.build.linux, { executableName: "blueai", icon: "assets/icon.png" });
  assert.deepEqual(out.build.publish, [{ provider: "github", owner: "o", repo: "r" }]);
  assert.equal(pkg.productName, "Rakazo");
});

test("derives ids from the name unless brand.json sets them", () => {
  const derived = resolveBrand({ name: "Blue AI" });
  assert.deepEqual(derived.desktop, { appId: "ai.blueai.desktop", executableName: "blueai" });
  assert.deepEqual(derived.mobile, { bundleId: "ai.blueai.app" });
  const custom = resolveBrand({ name: "BlueAI", desktop: { appId: "com.example.blue" } });
  assert.deepEqual(custom.desktop, { appId: "com.example.blue", executableName: "blueai" });
});

test("rejects names that would break strings or ids", () => {
  assert.throws(() => resolveBrand({}));
  assert.throws(() => resolveBrand({ name: 'Blue"AI' }));
  assert.throws(() => resolveBrand({ name: "Rakazo" }));
  assert.throws(() => resolveBrand({ name: "ブルー" }));
  assert.throws(() => resolveBrand({ name: "BlueAI", mobile: { expo: { owner: "ours" } } }));
  assert.equal(resolveBrand(brand).name, "BlueAI");
});
