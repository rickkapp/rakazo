#!/usr/bin/env node
// Rebrands the product in place from brand/brand.json.
//
//   node scripts/brand/apply.mjs          rewrite the working tree
//   node scripts/brand/apply.mjs --check  list what would change; exit 1 if anything would
//
// Only the name people see changes. Package names (@rakazo/*), env vars (RAKAZO_*), database
// names, storage keys and wire protocol (X-Rakazo-* headers, the Rakazo/ user agent) stay as they
// are, so upstream merges stay clean and a rebranded server still talks to its own clients.
// Running it twice is a no-op.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const UPSTREAM_NAME = "Rakazo";

/** Product code and its tests. The marketing site, docs and changelog describe upstream. */
const ROOTS = [
  "apps/api/",
  "apps/desktop/",
  "apps/mobile/",
  "apps/web/",
  "apps/worker/",
  "packages/",
];

const TEXT_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".cjs",
  ".json",
  ".html",
  ".po",
  ".md",
  ".swift",
  ".kt",
  ".xml",
  ".plist",
  ".strings",
  ".yaml",
  ".yml",
  ".css",
  ".prisma",
]);

/**
 * Lines that name the upstream brand as data rather than display text: values already stored in
 * databases or sent to other services, which a rename would orphan.
 */
const PROTECTED_LINES = [
  /x-rakazo-/i, // request header names
  /Rakazo-owned compacted/, // marker stored in message history and matched on read
  /PLUGIN_REGISTRY = |registry: "Rakazo"|\["Rakazo", "Reviewed notes\."\]/, // stored registry id
  /getProjectName|"app-target/, // Expo fixtures with their own iOS project name
];

/**
 * The name as a word, but not inside an identifier, a URL or path, a file name, a user agent or
 * a header: `RakazoIntents`, `github.com/elie222/Rakazo`, `Rakazo.icon`, `Rakazo.exe`,
 * `Rakazo/0.1`, `startsWith("Rakazo/")`, `/^Rakazo\//`, `X-Rakazo-Space-Id`. The macOS bundle
 * the build names after the product (`Rakazo.app`, `MacOS/Rakazo`) follows it, and so do
 * `@Rakazo` mentions, `/Rakazo Cloud/` patterns and Hebrew's `ל-Rakazo`.
 */
function namePattern(from) {
  const before = String.raw`(?:(?<![./\\\w])(?<!\w-)|(?<=MacOS/)|(?<=/)(?=${from}(?: |\.app\b)))`;
  const after = String.raw`(?!\w|\.(?!app\b)[A-Za-z]|/[\w."'${"`"}]|\\/|-\d)`;
  return new RegExp(`${before}${from}${after}`, "g");
}

/** Upstream identifiers that follow the brand wherever they appear. */
function derivedReplacements(brand) {
  return brand.desktop?.appId ? { "dev.rakazo.desktop": brand.desktop.appId } : {};
}

/**
 * Checks brand.json and fills in what follows from the name, so renaming the product is a
 * one-field change: `BlueAI` becomes app id `ai.blueai.desktop` and executable `blueai` unless
 * brand.json sets them.
 */
export function resolveBrand(raw) {
  if (typeof raw?.name !== "string" || !/^[\p{L}\p{N}][\p{L}\p{N} ]*$/u.test(raw.name)) {
    throw new Error('brand.json needs a "name" made of letters, digits and spaces');
  }
  if (raw.name === UPSTREAM_NAME) throw new Error(`"name" is already ${UPSTREAM_NAME}`);
  const slug = raw.name.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!slug) throw new Error('"name" needs at least one Latin letter or digit for its ids');
  return {
    ...raw,
    desktop: {
      appId: `ai.${slug}.desktop`,
      executableName: slug,
      ...raw.desktop,
    },
  };
}

export function rebrandText(text, brand, from = UPSTREAM_NAME) {
  let out = text;
  const replacements = { ...derivedReplacements(brand), ...brand.replace };
  for (const [before, after] of Object.entries(replacements)) {
    out = out.split(before).join(after);
  }
  const pattern = namePattern(from);
  return out
    .split("\n")
    .map((line) =>
      PROTECTED_LINES.some((rule) => rule.test(line)) ? line : line.replace(pattern, brand.name),
    )
    .join("\n");
}

/** Fields of the desktop package.json that are names or identifiers, not prose. */
export function rebrandDesktopPackage(pkg, brand) {
  const next = structuredClone(pkg);
  next.productName = brand.name;
  next.author = { ...next.author, name: brand.name };
  const desktop = brand.desktop ?? {};
  if (desktop.appId) next.build.appId = desktop.appId;
  if (desktop.executableName) {
    next.build.linux = { ...next.build.linux, executableName: desktop.executableName };
    next.build.extraMetadata = { ...next.build.extraMetadata, name: desktop.executableName };
  }
  if (desktop.updates) {
    next.build.publish = [{ provider: "github", ...desktop.updates }];
  }
  return next;
}

function trackedFiles(root) {
  return execFileSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8" })
    .split("\0")
    .filter(
      (file) =>
        ROOTS.some((prefix) => file.startsWith(prefix)) &&
        TEXT_EXTENSIONS.has(path.extname(file)) &&
        !file.includes("/node_modules/"),
    );
}

export function applyBrand(root, brand, { check = false } = {}) {
  const changed = [];
  for (const file of trackedFiles(root)) {
    const full = path.join(root, file);
    if (!existsSync(full)) continue;
    const before = readFileSync(full, "utf8");
    let after = rebrandText(before, brand);
    if (file === "apps/desktop/package.json") {
      after = `${JSON.stringify(rebrandDesktopPackage(JSON.parse(after), brand), null, 2)}\n`;
    }
    if (after === before) continue;
    changed.push(file);
    if (!check) writeFileSync(full, after);
  }
  return changed;
}

function main() {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== "--check")) {
    console.error("Usage: node scripts/brand/apply.mjs [--check]");
    process.exit(2);
  }
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  const brand = resolveBrand(JSON.parse(readFileSync(path.join(root, "brand/brand.json"), "utf8")));
  const check = args.includes("--check");
  const changed = applyBrand(root, brand, { check });
  for (const file of changed) console.log(`${check ? "would change" : "rebranded"} ${file}`);
  console.log(
    changed.length === 0
      ? `Already branded as ${brand.name}.`
      : `${changed.length} files ${check ? "still name" : "now name"} ${check ? UPSTREAM_NAME : brand.name}.`,
  );
  if (check && changed.length > 0) process.exit(1);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main();
