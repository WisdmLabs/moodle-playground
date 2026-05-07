# Moodle Playground — Agent Skill

You are working with **Moodle Playground**, a browser-based Moodle environment powered by WebAssembly. Moodle runs entirely in the browser — no server required. Use this skill when building demos, testing configurations, or prototyping Moodle features.

## Quick Start

### Embed in a web page

```html
<iframe id="playground" style="width:100%;height:600px;border:none;"></iframe>
<script type="module">
  import { startMoodlePlayground } from '@edwiser/moodle-playground-client';
  const client = await startMoodlePlayground(
    document.getElementById('playground'),
    { moodleVersion: '5.0', phpVersion: '8.3' }
  );
  await client.isReady();
</script>
```

### Use the MCP server (AI agents)

```bash
npx @edwiser/moodle-playground-mcp
```

This starts a stdio-based MCP server that connects to a running playground instance via WebSocket. Configure it in your AI tool's MCP settings.

## Available MCP Tools

| Tool | Description |
|------|-------------|
| `moodle/navigate` | Navigate to a Moodle URL path |
| `moodle/runPhp` | Execute PHP code in the Moodle runtime |
| `moodle/readFile` | Read a file from the Moodle filesystem |
| `moodle/writeFile` | Write a file to the Moodle filesystem |
| `moodle/listFiles` | List files in a directory |
| `moodle/mkdir` | Create a directory |
| `moodle/deleteFile` | Delete a file |
| `moodle/deleteDirectory` | Delete a directory |
| `moodle/fileExists` | Check if a file/directory exists |
| `moodle/exportSite` | Export site state as ZIP |
| `moodle/importSite` | Import site state from ZIP |
| `moodle/getSiteInfo` | Get Moodle site information |
| `moodle/getCurrentUrl` | Get current page URL |
| `moodle/getWebsiteUrl` | Get playground base URL |
| `moodle/resetSite` | Reset to fresh install |
| `moodle/saveSite` | Save current state |
| `moodle/setConfig` | Set a Moodle config value |
| `moodle/installPlugin` | Install a plugin from ZIP URL |
| `moodle/applyBlueprint` | Apply a blueprint JSON |
| `moodle/getBlueprint` | Get current blueprint |
| `moodle/listSites` | List active instances |

## Blueprints

Blueprints are JSON documents that describe the desired state of a playground instance. They automate setup: creating courses, enrolling users, installing plugins, and configuring settings.

```json
{
  "moodleVersion": "5.0",
  "phpVersion": "8.3",
  "steps": [
    { "step": "installMoodle", "options": { "adminPassword": "admin" } },
    { "step": "setSiteConfig", "options": { "name": "fullname", "value": "My Demo Site" } },
    { "step": "createCourse", "options": { "fullname": "Demo Course", "shortname": "DEMO101" } }
  ]
}
```

See `references/blueprint-format.md` for the full step catalog.

## URL Parameters

The playground accepts URL parameters for configuration:

| Parameter | Example | Description |
|-----------|---------|-------------|
| `moodle` | `5.0` | Moodle version |
| `php` | `8.3` | PHP version |
| `blueprint` | base64 JSON | Auto-apply blueprint |
| `url` | `/admin/index.php` | Landing page |
| `plugin` | GitHub ZIP URL | Auto-install plugin(s) |
| `theme` | `boost` | Active theme |
| `debug` | `true` | Enable debug output |
| `lang` | `es` | UI language |
| `login` | `admin` | Auto-login user |
| `mode` | `seamless` | Display mode |
| `lazy` | `true` | Defer boot until interaction |

See `references/url-parameters.md` for full details.

## Key Constraints

- **Ephemeral**: All state lives in browser memory (MEMFS). Closing the tab destroys everything.
- **SQLite only**: Moodle runs on the deprecated SQLite PDO driver — no MySQL/PostgreSQL.
- **Single user**: One PHP process handles all requests sequentially.
- **No cron**: Background tasks don't run automatically.
- **No outbound network** (Firefox/Safari): PHP `curl` calls fail in some browsers.
- **Memory limit**: ~256MB WASM heap. Large courses or file uploads may hit limits.

## Supported Versions

| Moodle | PHP Versions |
|--------|-------------|
| 4.4 | 8.1, 8.2, 8.3 |
| 4.5 LTS | 8.1, 8.2, 8.3 |
| 5.0 (default) | 8.2, 8.3, 8.4 |
| 5.1 | 8.2, 8.3, 8.4 |
| 5.2 | 8.2, 8.3, 8.4 |
| dev (main) | 8.2, 8.3, 8.4, 8.5 |
