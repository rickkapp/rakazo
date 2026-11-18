import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadServerSkills } from "./server-skills.js";

function skillDir(files: Record<string, string>): string {
  const dir = mkdtempSync(path.join(tmpdir(), "server-skills-"));
  for (const [folder, content] of Object.entries(files)) {
    mkdirSync(path.join(dir, folder));
    writeFileSync(path.join(dir, folder, "SKILL.md"), content);
  }
  return dir;
}

describe("loadServerSkills", () => {
  it("reads every SKILL.md folder in name order", () => {
    const dir = skillDir({
      "b-skill": "---\nname: Bravo\ndescription: Second one\n---\n\nDo bravo.\n",
      "a-skill": "---\nname: Alpha\ndescription: First one\n---\n\nDo alpha.\n",
    });
    const skills = loadServerSkills(dir);
    expect(skills.map((skill) => skill.name)).toEqual(["Alpha", "Bravo"]);
    expect(skills[0]?.description).toBe("First one");
    expect(skills[0]?.content).toContain("Do alpha.");
    expect(skills[0]?.content).toMatch(/^---\n/);
  });

  it("skips folders without a valid SKILL.md and repeated names", () => {
    const dir = skillDir({
      "a-good": "---\nname: Good\ndescription: Works\n---\n\nBody.\n",
      "b-again": "---\nname: good\ndescription: Same name\n---\n\nBody.\n",
      broken: "no frontmatter here",
    });
    mkdirSync(path.join(dir, "empty"));
    expect(loadServerSkills(dir).map((skill) => skill.name)).toEqual(["Good"]);
  });

  it("returns nothing when the directory is unset or missing", () => {
    expect(loadServerSkills("")).toEqual([]);
    expect(loadServerSkills(path.join(tmpdir(), "does-not-exist-server-skills"))).toEqual([]);
  });
});
