# AI Integration

Moodle Playground can be controlled by AI coding assistants like **Claude Code**,
**Cursor**, and **GitHub Copilot**. This means you can ask your AI assistant to
create courses, install plugins, write PHP code, and manage your playground
instance — all through natural language.

This works through the **Model Context Protocol (MCP)**, an open standard that
lets AI tools connect to external services. You don't need to understand MCP to
use it — just install the server, connect your AI tool, and start asking.

## What can the AI do?

Once connected, your AI assistant can:

- **Create courses and users** — "Create a course called Physics 101 with 5 sections"
- **Install plugins** — "Install the subcourse activity from moodlehq on GitHub"
- **Write and test PHP** — "Run PHP to check the Moodle version"
- **Manage files** — "Write a local plugin that adds a greeting page"
- **Configure settings** — "Enable developer debug mode"
- **Export/import state** — "Save this playground so I can restore it later"

## How it works

```text
You  -->  AI Assistant (Claude, Cursor, Copilot)
            |  (stdio)
            v
          MCP Server  (@moodle-playground/mcp-server)
            |  (WebSocket on localhost)
            v
          Browser tab running Moodle Playground
            |
            v
          PHP/Moodle in WebAssembly
```

The MCP server is a small program that runs on your computer. Your AI tool talks
to it, and it forwards commands to the Moodle Playground running in your browser.

## Getting Started

### 1. Start the MCP server

```bash
npx @moodle-playground/mcp-server
```

This starts the MCP server and opens the playground in your browser automatically.
The server bridges commands from your AI tool to the running playground.

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

## Example: Your first AI-powered session

After setup, try these in your AI assistant:

!!! example "Create a demo course"
    > "Create a course called 'Introduction to AI' with shortname AI101,
    > create a student user, and enroll them."

    The AI will use `moodle/runPhp` to call Moodle's `create_course()` API,
    create a user, and set up enrollment — all automatically.

!!! example "Install and test a plugin"
    > "Install the subcourse plugin from moodlehq on GitHub and create a
    > course that uses it."

    The AI will use `moodle/installPlugin` with the GitHub ZIP URL, then
    navigate to `/admin/index.php` to complete the upgrade.

!!! example "Debug a problem"
    > "Enable debug mode and check what plugins are installed."

    The AI will use `moodle/setConfig` to enable developer debugging, then
    use `moodle/runPhp` to query `core_plugin_manager`.

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
