#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = join(__dirname, "skills");

const TARGETS = {
  claude: {
    global: join(homedir(), ".claude", "skills"),
    local: ".claude/skills",
  },
  cursor: {
    global: join(homedir(), ".cursor", "rules"),
    local: ".cursor/rules",
  },
  vscode: {
    global: join(homedir(), ".vscode", "skills"),
    local: ".vscode/skills",
  },
};

function usage() {
  console.log(`Usage: moodle-playground-skills [options]

Install Moodle Playground agent skills for AI coding assistants.

Options:
  --agent <name>    Target agent: claude, cursor, vscode (default: claude)
  --skill <name>    Specific skill to install (default: all)
  --global          Install to user-level directory
  --local           Install to current project (default)
  --dest <path>     Custom destination directory
  --dry-run         Preview without installing
  --help            Show this help

Examples:
  npx @moodle-playground/agent-skills --agent claude --global
  npx @moodle-playground/agent-skills --skill moodle-playground
  npx @moodle-playground/agent-skills --dest ./my-project/.claude/skills
`);
}

function main() {
  const args = process.argv.slice(2);
  let agent = "claude";
  let skill = null;
  let scope = "local";
  let dest = null;
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--agent":
        agent = args[++i];
        break;
      case "--skill":
        skill = args[++i];
        break;
      case "--global":
        scope = "global";
        break;
      case "--local":
        scope = "local";
        break;
      case "--dest":
        dest = args[++i];
        break;
      case "--dry-run":
        dryRun = true;
        break;
      case "--help":
      case "-h":
        usage();
        process.exit(0);
    }
  }

  const target = TARGETS[agent];
  if (!target) {
    console.error(`Unknown agent: ${agent}. Use: claude, cursor, vscode`);
    process.exit(1);
  }

  const destination = dest || (scope === "global" ? target.global : resolve(target.local));

  const availableSkills = ["moodle-playground", "moodle-plugin-development"];
  const skillsToInstall = skill ? [skill] : availableSkills;

  for (const s of skillsToInstall) {
    if (!availableSkills.includes(s)) {
      console.error(`Unknown skill: ${s}. Available: ${availableSkills.join(", ")}`);
      process.exit(1);
    }

    const src = join(SKILLS_DIR, s);
    const dst = join(destination, s);

    if (dryRun) {
      console.log(`[dry-run] Would copy: ${src} -> ${dst}`);
      continue;
    }

    mkdirSync(dst, { recursive: true });
    cpSync(src, dst, { recursive: true });
    console.log(`Installed skill "${s}" to ${dst}`);
  }

  if (!dryRun) {
    console.log(`\nDone! ${skillsToInstall.length} skill(s) installed for ${agent}.`);
  }
}

main();
