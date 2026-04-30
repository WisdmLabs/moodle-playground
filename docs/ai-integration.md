# AI Integration

Moodle Playground provides first-class AI agent integration through the
**Model Context Protocol (MCP)**, a **JavaScript client library**, and
**publishable agent skills**.

## Overview

```text
AI Agent (Claude, Cursor, Copilot)
  |  stdio
  v
@moodle-playground/mcp   (Node.js MCP server)
  |  WebSocket (localhost)
  v
Browser — Moodle Playground
  remote.html -> worker -> PHP WASM
```

## Getting Started

### 1. Start the MCP server

```bash
npx @moodle-playground/mcp-server
```

This starts a stdio-based MCP server and opens the playground in your browser.
The server bridges tool calls to the running playground via WebSocket.

### 2. Connect your AI tool

=== "Claude Code"

    ```bash
    claude mcp add --transport stdio --scope user \
      moodle-playground -- npx -y @moodle-playground/mcp-server
    ```

    Or add to `.claude/settings.json`:

    ```json
    {
      "mcpServers": {
        "moodle-playground": {
          "command": "npx",
          "args": ["-y", "@moodle-playground/mcp-server"]
        }
      }
    }
    ```

=== "Cursor"

    Add to `.cursor/mcp.json`:

    ```json
    {
      "mcpServers": {
        "moodle-playground": {
          "command": "npx",
          "args": ["-y", "@moodle-playground/mcp-server"]
        }
      }
    }
    ```

=== "Claude Desktop"

    Add to your MCP configuration:

    ```json
    {
      "mcpServers": {
        "moodle-playground": {
          "command": "npx",
          "args": ["-y", "@moodle-playground/mcp-server"]
        }
      }
    }
    ```

### 3. Install agent skills (optional)

Agent skills provide context and reference documentation to your AI tool:

```bash
npx @moodle-playground/agent-skills --agent claude --global
```

## MCP Tools

21 tools for controlling the playground:

| Tool | Description |
|------|-------------|
| `moodle/navigate` | Navigate to a Moodle URL path |
| `moodle/runPhp` | Execute PHP code in the runtime |
| `moodle/readFile` | Read a file from MEMFS |
| `moodle/writeFile` | Write a file to MEMFS |
| `moodle/listFiles` | List directory contents |
| `moodle/mkdir` | Create a directory |
| `moodle/deleteFile` | Delete a file |
| `moodle/deleteDirectory` | Delete a directory |
| `moodle/fileExists` | Check file/directory existence |
| `moodle/getSiteInfo` | Get Moodle site metadata |
| `moodle/getCurrentUrl` | Get current page URL |
| `moodle/getWebsiteUrl` | Get playground base URL |
| `moodle/resetSite` | Reset to fresh install |
| `moodle/exportSite` | Export state as ZIP |
| `moodle/saveSite` | Save state (alias for export) |
| `moodle/importSite` | Import state from ZIP |
| `moodle/setConfig` | Set Moodle config value |
| `moodle/installPlugin` | Install plugin from ZIP URL |
| `moodle/applyBlueprint` | Apply blueprint JSON |
| `moodle/getBlueprint` | Get active blueprint |
| `moodle/listSites` | List active instances |

## MCP Resources

Read-only data endpoints for AI context gathering:

| Resource URI | Description |
|-------------|-------------|
| `moodle://site/info` | Site name, version, PHP version |
| `moodle://site/config` | Moodle configuration values |
| `moodle://site/courses` | Course list with IDs |
| `moodle://site/users` | User list with roles |
| `moodle://site/plugins` | Installed plugins and versions |
| `moodle://blueprint/current` | Active blueprint JSON |
| `moodle://logs/recent` | Recent log entries |

## MCP Prompts

Guided workflows for common tasks:

| Prompt | Description |
|--------|-------------|
| `create-course` | Create a course with sensible defaults |
| `install-plugin` | Install a plugin from GitHub |
| `debug-error` | Enable debug mode and investigate |
| `export-and-share` | Export site state for sharing |
| `setup-test-environment` | Create users, courses, enrollments |

## Agent Skills

Two skill packages provide deep context for AI agents:

### `moodle-playground`

General playground usage: MCP tools, blueprints, URL parameters, version
compatibility, and constraints.

### `moodle-plugin-development`

Plugin development workflow: creating plugins in-browser, testing via MCP tools,
plugin types, and debugging strategies.

Install skills:

```bash
# Claude Code (global)
npx @moodle-playground/agent-skills --agent claude --global

# Cursor (project-level)
npx @moodle-playground/agent-skills --agent cursor --local

# Specific skill only
npx @moodle-playground/agent-skills --skill moodle-plugin-development
```

## Architecture

The MCP integration follows the same pattern as WordPress Playground:

1. **MCP Server** (`@moodle-playground/mcp`) — Node.js CLI that implements the
   MCP protocol over stdio and bridges to the browser via WebSocket
2. **WebSocket Bridge** — Connects the MCP server to the browser playground
   on `localhost:7999` with token-based authentication
3. **Browser Client** — In `remote.html`, a WebSocket client receives tool
   calls and dispatches them through the existing worker message bus
4. **PHP Worker** — Handles operations by executing PHP code or manipulating
   the MEMFS filesystem directly

Security: WebSocket connections are localhost-only with random token
authentication. No remote connections are accepted.

## Limitations

- **Ephemeral**: All state is lost when the browser tab closes
- **Single connection**: One AI agent per playground instance
- **Timeout**: Tool calls timeout after 60 seconds
- **Browser required**: The MCP server needs a browser tab running the playground
