# Phase 3 Execution Plan: AI Integration Features

**Goal:** Achieve WordPress Playground feature parity for AI agent integration.

**Reference:** WordPress Playground ships `@wp-playground/mcp` (standalone MCP server),
`@wordpress/agent-skills` (publishable skills), and 21 MCP tools. Moodle Playground
currently has an MVP postMessage bridge with 7 tools and no standalone server.

---

## Architecture Overview

```text
┌────────────────────────────────────────────────────────────────────┐
│  AI Client (Claude Code, Cursor, Gemini CLI, VS Code)             │
│     ↕ stdio                                                       │
├────────────────────────────────────────────────────────────────────┤
│  @moodle-playground/mcp  (Node.js CLI)                            │
│     ↕ WebSocket (localhost:7999)                                  │
├────────────────────────────────────────────────────────────────────┤
│  Browser — Moodle Playground                                      │
│     remote.html → WebSocket client ↔ worker ↔ PHP WASM           │
└────────────────────────────────────────────────────────────────────┘
```

The standalone MCP server runs as a local Node.js process. AI agents connect via stdio.
The server connects to the browser playground via WebSocket on a localhost port.
This mirrors WordPress Playground's architecture exactly.

---

## Phase 3a: Standalone MCP Server (`@moodle-playground/mcp`)

**Priority:** Critical — this is the #1 gap. Without a standalone server, no AI agent
can connect to Moodle Playground via standard MCP tooling.

### WS13: MCP Server Package

**New files:**
- `packages/mcp/package.json`
- `packages/mcp/src/index.js` — entry point, CLI arg parsing
- `packages/mcp/src/server.js` — MCP server with stdio transport
- `packages/mcp/src/ws-bridge.js` — WebSocket bridge to browser
- `packages/mcp/src/tools.js` — tool definitions and handlers
- `packages/mcp/bin/mcp-server.js` — CLI executable (`#!/usr/bin/env node`)

**Implementation:**

1. **Package setup** (`packages/mcp/package.json`)
   - Name: `@moodle-playground/mcp`
   - Type: `module`
   - Bin: `{ "moodle-playground-mcp": "./bin/mcp-server.js" }`
   - Dependencies: `@modelcontextprotocol/sdk` (official MCP SDK for Node.js)
   - Peer: none — standalone CLI tool

2. **CLI entry** (`bin/mcp-server.js`)
   - Parse args: `--port` (default 7999), `--playground-url` (default `https://moodle-playground.com`)
   - Start the MCP server with stdio transport
   - Print connection URL to stderr (so AI client doesn't capture it)

3. **MCP server** (`src/server.js`)
   - Use `@modelcontextprotocol/sdk` `Server` class with `StdioServerTransport`
   - Register tool handlers from `tools.js`
   - Protocol version: `2025-03-26` (latest MCP spec)
   - Server info: `{ name: "moodle-playground", version: "0.1.0" }`

4. **WebSocket bridge** (`src/ws-bridge.js`)
   - Start WebSocket server on `--port` (default 7999)
   - Generate a random security token at startup
   - Accept connections only from `localhost` with matching token
   - Forward tool calls to browser, receive results
   - Connection lifecycle: wait for browser → tool call → forward → response → return
   - Timeout: 60s per tool call (matches existing bridge timeout)
   - Reconnection: if browser disconnects, queue tool calls and return error

5. **Tool definitions** (`src/tools.js`)
   - Port all 7 existing tools from `src/mcp/bridge.js`
   - Add 14 new tools (see WS14 below)
   - Each tool: `{ name, description, inputSchema (JSON Schema), handler }`

**Testing:**
- Unit tests for tool definitions and argument validation
- Integration test: spawn server, connect WebSocket, call tool, verify response

### WS14: Expanded MCP Tool Set

Expand from 7 to 21 tools to match WordPress Playground's coverage.

**New tools to add (14):**

Site Management:
- `moodle/getWebsiteUrl` — return the current playground URL
- `moodle/getSiteInfo` — return Moodle version, PHP version, site name, admin user
- `moodle/listSites` — list active playground instances (multi-instance)
- `moodle/saveSite` — trigger site export and return ZIP
- `moodle/resetSite` — reset to fresh install state
- `moodle/getCurrentUrl` — return the current page path

Filesystem (expanded):
- `moodle/mkdir` — create a directory in MEMFS
- `moodle/deleteFile` — delete a file from MEMFS
- `moodle/deleteDirectory` — delete a directory from MEMFS
- `moodle/fileExists` — check if a file exists

Blueprint:
- `moodle/applyBlueprint` — apply a blueprint JSON to the running instance
- `moodle/getBlueprint` — return the currently active blueprint

Configuration:
- `moodle/setConfig` — set a Moodle config value via `$DB->set_field()`
- `moodle/installPlugin` — install a plugin from a ZIP URL

**Where they live:**
- MCP server: `packages/mcp/src/tools.js` (full definitions)
- Browser bridge: `src/mcp/bridge.js` (add matching handlers)
- Client library: `packages/client/src/index.js` (add matching methods)
- Remote handler: `src/remote/main.js` `handleClientMessage()` (add cases)
- Worker handler: `php-worker.js` (add message handlers for new operations)

**Message flow for each new tool:**
```
MCP Server → WebSocket → remote.html → handleClientMessage()
  → BroadcastChannel → php-worker.js → MEMFS/PHP operation
  → BroadcastChannel → remote.html → WebSocket → MCP Server → AI client
```

### WS15: Browser-Side WebSocket Client

The browser needs a WebSocket client to receive tool calls from the MCP server.

**Modified files:**
- `src/remote/main.js` — add WebSocket connection logic
- `src/shared/version-resolver.js` — `mcp` param already parsed, use it

**Implementation:**

1. **WebSocket client** (in `src/remote/main.js`)
   - When `?mcp=yes` or when MCP server connection URL is provided:
     - Connect to `ws://localhost:<port>?token=<token>`
     - On message: parse MCP tool call, dispatch to `handleClientMessage()`
     - On response: send result back through WebSocket
   - Reconnect on disconnect with exponential backoff (1s, 2s, 4s, max 30s)

2. **Connection URL propagation**
   - MCP server prints `ws://localhost:7999?token=abc123` to stderr
   - User opens playground with `?mcp-ws=ws://localhost:7999?token=abc123`
   - `parseQueryParams()` already handles `mcp`; extend to parse `mcp-ws` URL
   - Alternative: MCP server auto-opens browser with the URL

3. **Security**
   - Only accept WebSocket connections from `localhost`
   - Token-based authentication (random token generated at server start)
   - No remote connections allowed

**Dependency between workstreams:**
- WS15 depends on WS13 (server must exist to connect to)
- WS14 depends on WS13 (tools are registered in the server)
- WS14 and WS15 can proceed in parallel once WS13 scaffolding is done

---

## Phase 3b: Agent Skills Package

**Priority:** High — makes Moodle Playground discoverable and usable by AI agents
without manual configuration.

### WS16: Publishable Agent Skills

Create `@moodle-playground/agent-skills` — a skills package installable via
`npx skills add` for Claude Code, Cursor, and Copilot.

**New files:**
- `packages/agent-skills/package.json`
- `packages/agent-skills/skills/moodle-playground/SKILL.md`
- `packages/agent-skills/skills/moodle-playground/references/blueprint-format.md`
- `packages/agent-skills/skills/moodle-playground/references/mcp-tools.md`
- `packages/agent-skills/skills/moodle-playground/references/url-parameters.md`
- `packages/agent-skills/skills/moodle-plugin-development/SKILL.md`
- `packages/agent-skills/skills/moodle-plugin-development/references/plugin-types.md`
- `packages/agent-skills/skills/moodle-plugin-development/references/testing-in-playground.md`
- `packages/agent-skills/install.js` — installation script for multi-target support

**Skill 1: `moodle-playground`**

Content for `SKILL.md`:
- When to use: spinning up Moodle environments, testing plugins, running PHP,
  creating courses/users, exporting/importing state
- Prerequisites: `npx @moodle-playground/mcp` or browser-based playground
- Procedure:
  1. Start MCP server (`npx @moodle-playground/mcp`)
  2. Open playground in browser (auto-opened or manual)
  3. Use MCP tools to control the instance
- Available tools: full list of 21 tools with input schemas
- Blueprint quickstart: minimal examples for common tasks
- Debugging: common failure modes, how to check logs
- Guardrails: ephemeral by design, no persistence, SQLite limitations

Reference files:
- `blueprint-format.md` — condensed blueprint reference for AI context
- `mcp-tools.md` — complete tool list with JSON Schema
- `url-parameters.md` — all URL parameters with examples

**Skill 2: `moodle-plugin-development`**

Content for `SKILL.md`:
- When to use: developing or testing Moodle plugins in the playground
- Procedure:
  1. Write plugin code locally
  2. Use `moodle/writeFile` to push files to MEMFS
  3. Use `moodle/runPhp` to trigger upgrade
  4. Test via `moodle/navigate`
- Plugin types: mod, block, local, theme, etc.
- Testing workflow: write → install → test → iterate
- Debugging: enable debug mode, read error logs

Reference files:
- `plugin-types.md` — supported plugin types and directory structure
- `testing-in-playground.md` — end-to-end plugin testing workflow

**Installation targets:**

```bash
# Claude Code
npx skills add @moodle-playground/agent-skills --skill moodle-playground

# Cursor
npx skills add @moodle-playground/agent-skills --agent cursor --skill moodle-playground

# All skills, all agents
npx skills add @moodle-playground/agent-skills
```

The `install.js` script:
- Detects the target agent from `--agent` flag or auto-detect
- Copies SKILL.md + references to the appropriate location:
  - Claude Code: `.claude/skills/` or `~/.claude/skills/`
  - Cursor: `.cursor/rules/`
  - VS Code: `.vscode/skills/`
- Supports `--global` (user-level) and `--local` (project-level) scopes

### WS17: MCP Server Configuration Files

Pre-built configuration snippets for popular AI clients.

**New files:**
- `packages/mcp/config/claude-code.json` — `.mcp.json` snippet for Claude Code
- `packages/mcp/config/claude-desktop.json` — Claude Desktop config
- `packages/mcp/config/cursor.json` — Cursor MCP config
- `packages/mcp/README.md` — setup guide with copy-paste configs

**Claude Code config example:**
```json
{
  "mcpServers": {
    "moodle-playground": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@moodle-playground/mcp"]
    }
  }
}
```

**CLI one-liner:**
```bash
claude mcp add --transport stdio --scope user moodle-playground -- npx -y @moodle-playground/mcp
```

---

## Phase 3c: Enhanced MCP Features

**Priority:** Medium — adds polish and advanced capabilities.

### WS18: MCP Resources

Expose read-only data as MCP resources (the MCP protocol's resource system).

**Resources to expose:**
- `moodle://site/info` — site name, version, URL, PHP version
- `moodle://site/config` — current Moodle configuration values
- `moodle://site/courses` — list of courses with IDs and shortnames
- `moodle://site/users` — list of users with roles
- `moodle://site/plugins` — installed plugins and versions
- `moodle://blueprint/current` — the currently active blueprint JSON
- `moodle://logs/recent` — recent runtime logs

**Implementation:**
- Add resource handlers to `packages/mcp/src/server.js`
- Each resource: `{ uri, name, description, mimeType, handler }`
- Resources are read-only; AI agents use them for context gathering
- Handlers dispatch to the browser via WebSocket (same as tools)

### WS19: MCP Prompts

Expose common workflows as MCP prompts (the MCP protocol's prompt system).

**Prompts to expose:**
- `create-course` — guided course creation with sensible defaults
- `install-plugin` — plugin installation from GitHub URL
- `debug-error` — enable debug mode, reproduce, capture logs
- `export-and-share` — export site, generate share URL
- `setup-test-environment` — create users, courses, enrolments for testing

**Implementation:**
- Add prompt handlers to `packages/mcp/src/server.js`
- Each prompt returns a messages array that the AI agent uses as context
- Prompts can include argument schemas for customization

### WS20: Auto-Open Browser

When the MCP server starts, automatically open the playground in the default browser
with the WebSocket connection URL pre-configured.

**Implementation:**
- In `packages/mcp/src/index.js`:
  - After WebSocket server starts, build URL with connection params
  - Use `open` npm package to launch default browser
  - Add `--no-open` flag to disable auto-open
  - Print the URL to stderr as fallback

---

## Phase 3d: Documentation & Polish

**Priority:** Medium — ensures discoverability and usability.

### WS21: Documentation

**New docs:**
- `docs/ai-integration.md` — overview of all AI features, getting started guide
- `packages/mcp/README.md` — MCP server setup, tool reference, troubleshooting
- `packages/agent-skills/README.md` — skills installation guide

**Updated docs:**
- `docs/mcp-bridge.md` — update with WebSocket transport, expanded tools, resources
- `docs/index.md` — add AI integration to features and navigation
- `docs/javascript-api.md` — add new client methods for expanded tools
- `mkdocs.yml` — add AI Integration nav entry
- `README.md` — update MCP section with installation one-liner

### WS22: Integration Tests

**New test files:**
- `tests/mcp/server.test.js` — MCP server tool registration and dispatch
- `tests/mcp/tools.test.js` — tool input validation and handler logic
- `tests/mcp/ws-bridge.test.js` — WebSocket connection lifecycle
- `tests/mcp/security.test.js` — token validation, localhost-only enforcement

---

## Execution Order

```
Phase 3a (Critical)
├── WS13: MCP Server Package ──────────────────┐
│     (standalone server, stdio, WebSocket)     │
├── WS14: Expanded Tool Set ───────────────────┤ (parallel after WS13 scaffold)
│     (14 new tools, browser handlers)         │
└── WS15: Browser WebSocket Client ────────────┘ (parallel after WS13 scaffold)
     (remote.html WebSocket connection)

Phase 3b (High)
├── WS16: Agent Skills Package ────────────────┐
│     (SKILL.md, references, install script)   │ (independent of Phase 3a)
└── WS17: MCP Config Files ───────────────────┘ (depends on WS13 package name)

Phase 3c (Medium)
├── WS18: MCP Resources ──────────────────────┐
│     (read-only data endpoints)              │ (depends on WS13)
├── WS19: MCP Prompts ────────────────────────┤ (depends on WS13)
└── WS20: Auto-Open Browser ──────────────────┘ (depends on WS15)

Phase 3d (Medium)
├── WS21: Documentation ──────────────────────┐
└── WS22: Integration Tests ──────────────────┘ (depends on all above)
```

## Estimated Scope

| Phase | Workstreams | New files | Modified files | Complexity |
|-------|------------|-----------|----------------|------------|
| 3a    | WS13–WS15  | ~8        | ~5             | High       |
| 3b    | WS16–WS17  | ~12       | ~2             | Medium     |
| 3c    | WS18–WS20  | ~3        | ~3             | Medium     |
| 3d    | WS21–WS22  | ~7        | ~5             | Low        |

**Total:** 10 workstreams, ~30 new files, ~15 modified files.

## Dependencies

- `@modelcontextprotocol/sdk` — official MCP SDK for Node.js (MIT license)
- `ws` — WebSocket library for Node.js (MIT license)
- `open` — cross-platform browser opener (MIT license, optional)

## Success Criteria

1. `npx @moodle-playground/mcp` starts a server that Claude Code can connect to
2. `claude mcp add moodle-playground -- npx -y @moodle-playground/mcp` works out of the box
3. All 21 tools callable from Claude Code and return correct results
4. Agent skills installable via `npx skills add @moodle-playground/agent-skills`
5. Browser auto-opens with WebSocket connection when MCP server starts
6. Resources and prompts visible in Claude Code's MCP tool list
7. Zero regressions in existing test suite
