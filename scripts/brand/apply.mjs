#!/usr/bin/env node
// Rebrands the product in place from brands/<id>/brand.json.
//
//   node scripts/brand/apply.mjs <id>          rewrite the working tree
//   node scripts/brand/apply.mjs <id> --check  list what would change; exit 1 if anything would
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
const ROOTS = ["apps/api/", "apps/desktop/", "apps/mobile/", "apps/web/", "apps/worker/", "packages/"];

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
  /PLUGIN_REGISTRY = /, // registry id stored with plugin submissions
];

/**
 * The name as a word, but not inside an identifier, a repository file name, a user agent or a
 * header: `RakazoIntents`, `Rakazo.icon`, `ios/Rakazo/`, `Rakazo/0.1`, `X-Rakazo-Space-Id`.
 * Names the build derives from the product name (`Rakazo.app`, `Rakazo.exe`, `MacOS/Rakazo`)
 * follow it, and so does a name after a non-Latin prefix such as Hebrew `ל-Rakazo`.
 */
function namePattern(from) {
  return new RegExp(
    `(?<![.@\\\\\\w])(?<!\\w-)${from}(?!\\w|\\.(?!(?:app|exe)\\b)[A-Za-z]|/[\\w.]|-\\d)`,
    "g",
  );
}

export function rebrandText(text, brand, from = UPSTREAM_NAME) {
  let out = text;
  for (const [before, after] of Object.entries(brand.replace ?? {})) {
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

export function validateBrand(brand) {
  if (typeof brand?.name !== "string" || !/^[\p{L}\p{N}][\p{L}\p{N} ]*$/u.test(brand.name)) {
    throw new Error('brand.json needs a "name" made of letters, digits and spaces');
  }
  if (brand.name === UPSTREAM_NAME) throw new Error(`"name" is already ${UPSTREAM_NAME}`);
  return brand;
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
  const [id, flag] = process.argv.slice(2);
  if (!id || (flag && flag !== "--check")) {
    console.error("Usage: node scripts/brand/apply.mjs <brand-id> [--check]");
    process.exit(2);
  }
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  const brandFile = path.join(root, "brands", id, "brand.json");
  if (!existsSync(brandFile)) {
    console.error(`No brand at brands/${id}/brand.json`);
    process.exit(2);
  }
  const brand = validateBrand(JSON.parse(readFileSync(brandFile, "utf8")));
  const check = flag === "--check";
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
