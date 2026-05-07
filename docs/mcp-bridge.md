# MCP Bridge

The Moodle Playground MCP (Model Context Protocol) bridge allows AI agents
to control the playground programmatically.

## Transports

### Standalone MCP Server (recommended)

The `@edwiser/moodle-playground-mcp` package provides a full MCP server that
AI agents connect to via stdio. The server bridges to the browser playground
via WebSocket.

```bash
npx @edwiser/moodle-playground-mcp
```

This is the recommended approach for Claude Code, Cursor, and other MCP-aware
tools. See the [AI Integration guide](ai-integration.md) for setup instructions.

### postMessage Bridge (embedded)

For embedded playgrounds, the built-in postMessage bridge (`src/mcp/bridge.js`)
enables direct communication from JavaScript:

```javascript
import { McpBridge } from './src/mcp/bridge.js';

const bridge = new McpBridge(iframe);
const result = await bridge.handleToolCall('moodle/runPhp', {
  code: '<?php echo "Hello!";'
});
```

### WebSocket Bridge

When the playground is opened with `?mcp-ws=ws://localhost:7999?token=<token>`,
it connects to the MCP server via WebSocket. The MCP server forwards tool calls
from the AI agent to the browser and returns results.

```
AI Agent <-> stdio <-> MCP Server <-> WebSocket <-> Browser Playground
```

## Available Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `moodle/navigate` | Navigate to a URL path | `path` |
| `moodle/runPhp` | Execute PHP code | `code` |
| `moodle/readFile` | Read a file from MEMFS | `path` |
| `moodle/writeFile` | Write a file to MEMFS | `path`, `data` |
| `moodle/listFiles` | List files in a directory | `dir` |
| `moodle/mkdir` | Create a directory | `path` |
| `moodle/deleteFile` | Delete a file | `path` |
| `moodle/deleteDirectory` | Delete a directory | `path` |
| `moodle/fileExists` | Check if path exists | `path` |
| `moodle/exportSite` | Export state as ZIP | — |
| `moodle/importSite` | Import ZIP to restore state | `data` (byte array) |
| `moodle/getWebsiteUrl` | Get playground base URL | — |
| `moodle/getSiteInfo` | Get site metadata | — |
| `moodle/getCurrentUrl` | Get current page URL | — |
| `moodle/resetSite` | Reset to fresh install | — |
| `moodle/saveSite` | Save state (alias for export) | — |
| `moodle/setConfig` | Set a config value | `name`, `value`, `plugin` |
| `moodle/installPlugin` | Install plugin from ZIP URL | `url`, `pluginType`, `pluginName` |
| `moodle/applyBlueprint` | Apply blueprint JSON | `blueprint` |
| `moodle/getBlueprint` | Get active blueprint | — |
| `moodle/listSites` | List active instances | — |

## Resources

MCP resources provide read-only data for AI context:

| URI | Description |
|-----|-------------|
| `moodle://site/info` | Site name, version, PHP version |
| `moodle://site/config` | Moodle configuration values |
| `moodle://site/courses` | Course list |
| `moodle://site/users` | User list |
| `moodle://site/plugins` | Installed plugins |
| `moodle://blueprint/current` | Active blueprint |
| `moodle://logs/recent` | Recent log entries |

## Prompts

MCP prompts provide guided workflows:

| Prompt | Description |
|--------|-------------|
| `create-course` | Course creation with defaults |
| `install-plugin` | Plugin installation from GitHub |
| `debug-error` | Error investigation workflow |
| `export-and-share` | Site export for sharing |
| `setup-test-environment` | Test data setup |

## Usage with Client Library

```javascript
import { startMoodlePlayground } from '@edwiser/moodle-playground-client';

const playground = await startMoodlePlayground(iframe, {
  mode: 'seamless',
});

await playground.isReady();

// Execute PHP
const result = await playground.runPhp('<?php echo PHP_VERSION;');

// Manage files
await playground.writeFile('/www/moodle/local/test.php', '<?php echo "test";');
const exists = await playground.fileExists('/www/moodle/local/test.php');

// Site management
const info = await playground.getSiteInfo();
await playground.setConfig('enableblogs', '0');

// Blueprints
await playground.applyBlueprint({
  steps: [{ step: 'createCourse', options: { fullname: 'Test', shortname: 'T1' } }]
});
```

## Security

- WebSocket connections are localhost-only with token-based authentication
- Tokens are randomly generated at server startup
- No remote connections are accepted
- The browser playground validates the token before accepting commands

## URL Parameters

| Parameter | Description |
|-----------|-------------|
| `mcp` | Enable postMessage MCP bridge (`?mcp=yes`) |
| `mcp-ws` | WebSocket URL for MCP server connection |
