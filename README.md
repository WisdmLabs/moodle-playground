# Moodle Playground

<p align="center">
  <img src=".github/screenshot.png" alt="Moodle Playground" width="600">
</p>

[Live demo](https://moodle-playground.com/) · [Documentation](https://moodle-playground.com/docs/) · [Blueprints](https://moodle-playground.com/docs/blueprint-json/)

> Run a full Moodle site in the browser — no server required.

Moodle Playground runs [Moodle](https://moodle.org) entirely in the browser using WebAssembly, powered by [WordPress Playground](https://github.com/WordPress/wordpress-playground)'s `@php-wasm/web` runtime. Every page load boots a fresh Moodle instance with a pre-built SQLite snapshot — nothing is stored on disk and nothing leaves your browser.

## Features

- **Browser-native** — runs entirely in-browser via WebAssembly; no server, no Docker
- **Ephemeral** — every tab gets a fresh Moodle; closing it destroys all state
- **Blueprints** — step-based JSON to provision users, courses, plugins, themes, and more
- **URL shortcuts** — install plugins, set themes, change language, and navigate via query params
- **Seamless & lazy modes** — embed as a borderless iframe or defer boot until the user clicks
- **Site export / import** — snapshot the full playground state as a ZIP and restore it later
- **Shareable URLs** — share blueprint links or GitHub Gists with one click
- **JavaScript client library** — `@moodle-playground/client` for programmatic control
- **AI agent integration** — MCP server with 21 tools, resources, prompts, and agent skills for Claude, Cursor, and Copilot
- **Crash recovery** — automatic runtime restart with state preservation on WASM OOM
- **Multiple Moodle versions** — 4.4, 4.5, 5.0, and more built in parallel

## Getting Started

### Try it online

Open the [live demo](https://moodle-playground.com/) — no install needed.

### Run it locally

```bash
git clone https://github.com/WisdmLabs/moodle-playground.git
cd moodle-playground
make up
```

Then open <http://localhost:8080>.

### Prerequisites

- Node.js 18+
- npm
- Python 3 for Moodle patch/build helpers and docs
- PHP 8.3 with `pdo_sqlite` (for `make up-local`)
- Git

## How It Works

```text
index.html          Shell UI (toolbar, address bar, log panel)
  └─ remote.html    Runtime host — registers the Service Worker
       ├─ sw.js     Intercepts requests → routes to PHP worker
       └─ php-worker.js
            └─ @php-wasm/web (WebAssembly, PHP 8.3)
                 ├─ Moodle core in writable MEMFS  (extracted from ZIP bundle)
                 └─ In-memory state                (SQLite + moodledata in MEMFS)
```

1. The shell boots a scoped runtime host inside an iframe.
2. The Service Worker intercepts all requests under `/playground/<scope>/<runtime>/…`.
3. The PHP worker extracts the Moodle ZIP bundle into writable MEMFS and loads a pre-built install snapshot.
4. Moodle runs against an in-memory SQLite database — fully ephemeral, no persistence.
5. If the PHP runtime crashes (WASM OOM / file descriptor exhaustion), the worker snapshots the DB and user files, boots a fresh runtime, and restores state automatically.

**Default credentials:** username `admin`, password `password`.

### No persistence by design

All state lives in memory (Emscripten MEMFS). Closing the tab destroys everything. This is intentional — the playground is meant for exploration, demos, and testing, not for storing data.

## URL Parameters

Configure the playground via query parameters — no blueprint file needed for common setups.

| Parameter | Description | Example |
|-----------|-------------|---------|
| `moodle` | Moodle version | `?moodle=5.0` |
| `php` | PHP version | `?php=8.3` |
| `plugin` | Install a plugin (repeatable) | `?plugin=mod_board` |
| `theme` | Set active theme | `?theme=moove` |
| `lang` | Site language | `?lang=es` |
| `url` | Landing page path | `?url=/course/view.php?id=2` |
| `mode` | Display mode (`seamless` hides UI) | `?mode=seamless` |
| `lazy` | Defer boot until user clicks | `?lazy=true` |
| `login` | Skip auto-login | `?login=no` |
| `blueprint` | Inline blueprint (JSON or base64) | `?blueprint=eyJz...` |
| `blueprint-url` | Remote blueprint URL (supports ZIP bundles) | `?blueprint-url=https://...` |
| `import-site` | Import a site ZIP on boot | `?import-site=https://...` |
| `moodle-pr` | Test a Moodle core PR | `?moodle-pr=12345` |
| `mcp` | Enable MCP bridge | `?mcp=yes` |

Combine them freely: `?plugin=mod_board&theme=moove&lang=es&url=/course/view.php?id=2`

## Blueprints

Blueprints are step-based JSON files that configure and provision a playground instance at boot. Inspired by [WordPress Playground Blueprints](https://wordpress.github.io/wordpress-playground/), they use Moodle-native naming and semantics.

```json
{
  "landingPage": "/course/view.php?id=2",
  "steps": [
    { "step": "installMoodle", "options": { "siteName": "My Moodle" } },
    { "step": "login", "username": "admin" },
    { "step": "installMoodlePlugin", "url": "https://github.com/moodlehq/moodle-block_participants/archive/refs/heads/master.zip" },
    { "step": "createCourse", "fullname": "Physics 101", "shortname": "PHYS101" },
    { "step": "addModule", "module": "label", "course": "PHYS101", "name": "Welcome", "intro": "<p>Hello World!</p>" }
  ]
}
```

A default blueprint is bundled at [`assets/blueprints/default.blueprint.json`](assets/blueprints/default.blueprint.json). Override it by:

- Passing `?blueprint=<inline-json-or-base64>` or `?blueprint-url=<url>` in the URL
- Encoding a blueprint in the URL hash fragment (`#base64-encoded-json`)
- Importing a `.json` file from the shell toolbar

Blueprints can provision:

- Site title, locale, timezone, and admin credentials (`installMoodle`)
- User sessions (`login`)
- Additional users (`createUser`, `createUsers`)
- Course categories (`createCategory`, `createCategories`)
- Courses and sections (`createCourse`, `createCourses`, `createSection`)
- Enrolments (`enrolUser`, `enrolUsers`)
- Course modules (`addModule` — label, assign, folder, etc.)
- Plugins and themes from ZIP URLs (`installMoodlePlugin`, `installTheme`)
- Moodle config values (`setConfig`, `setConfigs`)
- Language and config constants (`setSiteLanguage`, `defineConfigConstants`)
- Database operations (`runSql`, `runSqlFile`, `resetData`)
- Course backup restore (`restoreCourseBackup`)
- Filesystem operations (`writeFile`, `mkdir`, `unzip`, etc.)
- Arbitrary PHP code (`runPhpCode`, `runPhpScript`)

Use `constants` for `{{PLACEHOLDER}}` substitution and `resources` for named file references.

See the [Blueprint reference](docs/blueprint-json.md) for the full format, all step types, and examples. A sample blueprint is at [`blueprint-sample.json`](blueprint-sample.json).

Schema: [`assets/blueprints/blueprint-schema.json`](assets/blueprints/blueprint-schema.json).

## Site Export & Import

Snapshot the entire playground state (database, uploaded files, installed plugins) as a ZIP file and restore it later or share it with others.

- **Export**: Click the Export button in the info panel or use `playground.exportSite()` from the client library
- **Import**: Click the Import button or load a ZIP via `?import-site=<url>` in the URL
- **Format**: Standard ZIP containing `database/`, `filedir/`, `plugins/`, and a `playground.json` manifest

## Embedding & Client Library

Embed a Moodle Playground in any web page using an iframe:

```html
<iframe
  src="https://moodle-playground.com/?mode=seamless"
  style="width: 100%; height: 600px; border: none;"
></iframe>
```

For programmatic control, use the JavaScript client library:

```javascript
import { startMoodlePlayground } from '@moodle-playground/client';

const playground = await startMoodlePlayground(iframe, {
  moodleVersion: '5.0',
  phpVersion: '8.3',
  mode: 'seamless',
});

await playground.isReady();
await playground.navigate('/course/view.php?id=2');
```

See the [Embedding guide](docs/embedding.md), [JavaScript API reference](docs/javascript-api.md), and [MCP bridge docs](docs/mcp-bridge.md).

## AI Agent Integration

Control the playground from AI coding assistants via the MCP server:

```bash
# Start the MCP server
npx @moodle-playground/mcp-server

# Add to Claude Code
claude mcp add --transport stdio --scope user \
  moodle-playground -- npx -y @moodle-playground/mcp-server

# Install agent skills
npx @moodle-playground/agent-skills --agent claude --global
```

21 tools, 7 resources, and 5 prompts for navigating, executing PHP, managing files, installing plugins, and more. See the [AI Integration guide](docs/ai-integration.md).

## Sharing

Generate shareable URLs from the Share button in the toolbar:

- **Blueprint URL** — encodes the active blueprint in the URL hash (lightweight, no state)
- **Query parameters** — encodes version selections as URL parameters
- **GitHub Gist** — exports the blueprint as a GitHub Gist and generates a `?blueprint-url=` link

## Documentation

See the [development docs](docs/development.md) and [`AGENTS.md`](AGENTS.md) for the full command reference.

## Contributing

Contributions are welcome. See the [development docs](docs/development.md) to get started.

## License

See [LICENSE](LICENSE).
