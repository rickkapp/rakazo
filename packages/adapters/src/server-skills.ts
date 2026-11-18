import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { buildSkillMd, parseSkillMd } from "@rakazo/core";

export type ServerSkill = { name: string; description: string; content: string };

/**
 * Skills the operator ships to everyone on this server: every `<dir>/<skill>/SKILL.md` under
 * `BUILTIN_SKILLS_DIR`, read once at startup and offered like the built-in skills (read-only, in
 * every space). Unset or missing directory: none. A file that doesn't parse is skipped with a
 * warning on stderr rather than stopping the server.
 */
export function loadServerSkills(dir = process.env.BUILTIN_SKILLS_DIR?.trim()): ServerSkill[] {
  if (!dir) return [];
  let entries: string[];
  try {
    entries = readdirSync(dir).sort();
  } catch {
    return [];
  }
  const skills: ServerSkill[] = [];
  for (const entry of entries) {
    let raw: string;
    try {
      raw = readFileSync(path.join(dir, entry, "SKILL.md"), "utf8");
    } catch {
      continue;
    }
    const parsed = parseSkillMd(raw);
    if ("error" in parsed) {
      process.stderr.write(`Skipping server skill ${entry}: ${parsed.error}\n`);
      continue;
    }
    if (skills.some((skill) => skill.name.toLowerCase() === parsed.name.toLowerCase())) continue;
    skills.push({
      name: parsed.name,
      description: parsed.description,
      content: buildSkillMd(parsed),
    });
  }
  return skills;
}
