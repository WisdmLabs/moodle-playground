# MCP Bridge

The Moodle Playground MCP (Model Context Protocol) bridge allows AI agents
to control the playground programmatically.

## Overview

The MVP implementation uses postMessage for communication, making it compatible
with IDE extensions (VS Code, JetBrains) and the JavaScript client library.

## Available Tools

| Tool | Description |
|------|-------------|
| `moodle/navigate` | Navigate to a URL path |
| `moodle/runPhp` | Execute PHP code |
| `moodle/readFile` | Read a file from MEMFS |
| `moodle/writeFile` | Write a file to MEMFS |
| `moodle/listFiles` | List files in a directory |
| `moodle/exportSite` | Export state as ZIP |
| `moodle/importSite` | Import ZIP to restore state |

## Usage

### Via Client Library

```javascript
import { startMoodlePlayground } from '@moodle-playground/client';

const playground = await startMoodlePlayground(iframe, {
  mode: 'seamless',
});

await playground.isReady();
await playground.runPhp('<?php echo "Hello from MCP!";');
```

### Via URL Parameter

Enable the MCP bridge by adding `?mcp=yes` to the playground URL.

## Future: WebSocket Bridge

A full WebSocket-based bridge (via a companion CLI tool) is planned for
direct integration with AI agents that communicate over stdio/WebSocket.
