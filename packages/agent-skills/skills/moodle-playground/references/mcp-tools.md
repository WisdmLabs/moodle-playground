# MCP Tools Reference

The Moodle Playground MCP server exposes 21 tools for AI agent control.

## Connection

The MCP server uses stdio transport (for Claude Code, Cursor, etc.) and bridges to the browser playground via WebSocket.

```bash
# Start the MCP server
npx @moodle-playground/mcp-server

# With options
npx @moodle-playground/mcp-server --port 7999 --no-open
```

The server prints a connection URL to stderr. Open it in a browser to connect the playground.

## Tool Details

### `moodle/navigate`

Navigate the Moodle site to a specific URL path.

```json
{ "path": "/course/view.php?id=2" }
```

### `moodle/runPhp`

Execute PHP code in the Moodle runtime. Code runs as a CLI script with full Moodle API access.

```json
{ "code": "<?php\ndefine('CLI_SCRIPT', true);\nrequire('/www/moodle/config.php');\necho $CFG->version;" }
```

Always include `define('CLI_SCRIPT', true);` and `require('/www/moodle/config.php');` to access Moodle APIs.

### `moodle/readFile`

Read file contents from the MEMFS filesystem.

```json
{ "path": "/www/moodle/version.php" }
```

Returns the file content as a string.

### `moodle/writeFile`

Write content to a file in MEMFS.

```json
{ "path": "/www/moodle/local/myplugin/version.php", "data": "<?php\n$plugin->version = 2024010100;" }
```

### `moodle/listFiles`

List files and directories in a path.

```json
{ "dir": "/www/moodle/local/" }
```

### `moodle/mkdir`

Create a directory (and parents) in MEMFS.

```json
{ "path": "/www/moodle/local/myplugin/classes" }
```

### `moodle/deleteFile`

Delete a single file.

```json
{ "path": "/www/moodle/local/myplugin/old_file.php" }
```

### `moodle/deleteDirectory`

Delete a directory and its contents.

```json
{ "path": "/www/moodle/local/myplugin" }
```

### `moodle/fileExists`

Check whether a file or directory exists.

```json
{ "path": "/www/moodle/local/myplugin/version.php" }
```

Returns `true` or `false`.

### `moodle/getSiteInfo`

Get Moodle site metadata: version, release, site name, database type.

No parameters required.

### `moodle/getCurrentUrl`

Get the current page URL path within Moodle.

No parameters required.

### `moodle/getWebsiteUrl`

Get the base URL of the playground instance.

No parameters required.

### `moodle/resetSite`

Reset the playground to a fresh Moodle installation. All data is lost.

No parameters required.

### `moodle/saveSite` / `moodle/exportSite`

Export the current site state as a ZIP archive. `saveSite` is an alias for `exportSite`.

No parameters required.

### `moodle/importSite`

Import a previously exported ZIP to restore site state.

```json
{ "data": [80, 75, 3, 4, ...] }
```

The `data` field is an array of bytes representing the ZIP file.

### `moodle/setConfig`

Set a Moodle configuration value.

```json
{ "name": "enableblogs", "value": "0" }
```

For plugin-scoped config:

```json
{ "name": "enabled", "value": "1", "plugin": "mod_forum" }
```

### `moodle/installPlugin`

Install a Moodle plugin from a GitHub ZIP URL.

```json
{ "url": "https://github.com/moodlehq/moodle-mod_subcourse/archive/refs/heads/main.zip" }
```

Plugin type and name are auto-detected from the ZIP contents. Override with `pluginType` and `pluginName` if needed.

### `moodle/applyBlueprint`

Apply a blueprint JSON to configure the running instance.

```json
{
  "blueprint": {
    "steps": [
      { "step": "createCourse", "options": { "fullname": "Test", "shortname": "TEST" } }
    ]
  }
}
```

### `moodle/getBlueprint`

Get the currently active blueprint configuration.

No parameters required.

### `moodle/listSites`

List all active playground instances.

No parameters required.

## Error Handling

All tools return results in the MCP content format:

```json
{
  "content": [{ "type": "text", "text": "..." }]
}
```

On error, the tool call returns an error message. Common errors:
- Timeout (60s per tool call)
- Playground not connected (WebSocket not established)
- File not found (MEMFS path doesn't exist)
- PHP execution error (syntax error, fatal error in code)
