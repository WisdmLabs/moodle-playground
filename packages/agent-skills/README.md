# @edwiser/moodle-playground-agent-skills

AI agent skills for working with Moodle Playground. Install these skills to give
your AI coding assistant context about the playground's MCP tools, blueprint system,
and plugin development workflow.

## Installation

```bash
# Claude Code (global install)
npx @edwiser/moodle-playground-agent-skills --agent claude --global

# Claude Code (project-level)
npx @edwiser/moodle-playground-agent-skills --agent claude --local

# Cursor
npx @edwiser/moodle-playground-agent-skills --agent cursor --global

# VS Code
npx @edwiser/moodle-playground-agent-skills --agent vscode --global
```

## Available Skills

### `moodle-playground`

General playground usage — MCP tools, blueprints, URL parameters, version
compatibility, and constraints.

**References included:**
- Blueprint format with all step types
- MCP tool reference with input schemas
- URL parameters for configuration

### `moodle-plugin-development`

Plugin development in the playground — creating, testing, and debugging
Moodle plugins using the MEMFS filesystem and MCP tools.

**References included:**
- Complete list of Moodle plugin types and paths
- Testing strategies using MCP tools

## CLI Options

```
Usage: moodle-playground-skills [options]

Options:
  --agent <name>    Target agent: claude, cursor, vscode (default: claude)
  --skill <name>    Specific skill to install (default: all)
  --global          Install to user-level directory
  --local           Install to current project (default)
  --dest <path>     Custom destination directory
  --dry-run         Preview without installing
  --help            Show this help
```

## Where Skills Are Installed

| Agent | Global | Local |
|-------|--------|-------|
| Claude Code | `~/.claude/skills/` | `.claude/skills/` |
| Cursor | `~/.cursor/rules/` | `.cursor/rules/` |
| VS Code | `~/.vscode/skills/` | `.vscode/skills/` |
