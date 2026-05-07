# @edwiser/moodle-playground-mcp

MCP (Model Context Protocol) server for controlling Moodle Playground from AI coding agents like Claude Code, Cursor, and GitHub Copilot.

## How It Works

```
AI Agent ←→ stdio ←→ MCP Server ←→ WebSocket ←→ Browser Playground
```

The MCP server communicates with AI agents over stdio (standard MCP transport) and bridges tool calls to a running Moodle Playground instance in the browser via WebSocket.

## Quick Start

```bash
npx @edwiser/moodle-playground-mcp
```

This will:
1. Start the MCP server with WebSocket bridge on port 7999
2. Open a browser with the playground connected to the server
3. Begin accepting tool calls from your AI agent

## Configuration

### Claude Code

Add to `.claude/settings.json` or use the config file:

```json
{
  "mcpServers": {
    "moodle-playground": {
      "command": "npx",
      "args": ["-y", "@edwiser/moodle-playground-mcp"]
    }
  }
}
```

Or copy `config/claude-code.json` to your project's `.claude/settings.json`.

### Claude Desktop

Add to your Claude Desktop MCP configuration:

```json
{
  "mcpServers": {
    "moodle-playground": {
      "command": "npx",
      "args": ["-y", "@edwiser/moodle-playground-mcp"]
    }
  }
}
```

### Cursor

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "moodle-playground": {
      "command": "npx",
      "args": ["-y", "@edwiser/moodle-playground-mcp"]
    }
  }
}
```

## CLI Options

```
Usage: moodle-playground-mcp [options]

Options:
  --port <number>         WebSocket bridge port (default: 7999)
  --playground-url <url>  Custom playground URL
  --no-open               Don't auto-open browser
  --help                  Show help
```

## Available Tools

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

## Security

- WebSocket connections require a token (generated at startup)
- The server only listens on `localhost`
- Tokens are single-use per session

## Protocol

This server implements MCP protocol version `2024-11-05`.
