# Getting started

This page gets you from a fresh clone to a running Moodle Playground instance and your first blueprint. If you just want to try it, use the hosted version at <https://moodle-playground.com> — no install needed.

## Requirements

| Tool     | Version | Why |
|----------|---------|-----|
| Node.js  | **18+** | Runs the shell bundler and Playwright tests. |
| npm      | bundled | Package management. |
| Python 3 | 3.12+   | Moodle build helpers and docs (Zensical). |
| PHP      | 8.3     | Only needed when (re)generating install snapshots. |
| Git      | any     | Cloning and submodule fetches. |

!!! tip
    The hosted site does not need any of the above — all these requirements are only for **local development** or **contributing**.

## Local setup

```bash
git clone https://github.com/ateeducacion/moodle-playground.git
cd moodle-playground
npm install
```

## Building the runtime

=== "Default build"

    Build the shell bundle, the default Moodle ZIP and its install snapshot:

    ```bash
    make prepare
    make bundle
    ```

=== "All Moodle branches"

    Build every supported Moodle branch in parallel:

    ```bash
    make prepare-all JOBS=2
    ```

=== "Just the PHP worker"

    Useful after editing `php-worker.js` / `src/runtime/php-*.js`:

    ```bash
    npm run build:worker
    ```

## Running locally

```bash
make serve
```

This starts a static HTTP server at <http://localhost:8080>.

!!! info "Why a local HTTP server?"
    The playground uses a **service worker** to intercept requests and route them to the PHP runtime. Service workers only register on `https://` or `http://localhost`, so opening `index.html` straight from the filesystem will not work.

## Validation commands

Quick syntax checks across the runtime files:

```bash
node --check sw.js
node --check php-worker.js
node --check src/runtime/bootstrap.js
node --check src/runtime/php-loader.js
node --check src/runtime/php-compat.js
node --check src/runtime/crash-recovery.js
node --check src/shell/main.js
node --check src/remote/main.js
node --check src/blueprint/index.js
```

Blueprint unit tests:

```bash
npm run test:blueprint
```

Full lint + unit tests (same as CI):

```bash
make lint
make test
```

## Building the documentation

The docs site is built with [Zensical](https://zensical.org/), a Rust-backed static site generator that consumes the same `mkdocs.yml` as Material for MkDocs.

=== "With a local venv"

    ```bash
    python3.12 -m venv .venv
    source .venv/bin/activate
    pip install -r requirements-docs.txt
    zensical serve
    ```

=== "With Docker (no Python install)"

    ```bash
    docker run --rm -it -p 8000:8000 \
      -v "$PWD":/docs -w /docs \
      python:3.12-slim \
      sh -c "pip install --default-timeout=120 -r requirements-docs.txt && zensical serve -a 0.0.0.0:8000"
    ```

Preview at <http://localhost:8000>. The dev server auto-reloads on every edit.

!!! warning "Python 3.10+ required"
    Zensical's current releases target Python 3.10+. Older interpreters will resolve to a placeholder package on PyPI that has no CLI. If `zensical --version` errors out, double-check your interpreter.

## Configuration via URL parameters

The playground accepts URL parameters for version selection, blueprint loading, plugin installation, and display modes:

### Version & blueprint

| Parameter       | Example                                  | Description |
|-----------------|------------------------------------------|-------------|
| `moodle`        | `?moodle=4.4`                            | Moodle branch to load. |
| `php`           | `?php=8.3`                               | PHP version to boot. |
| `blueprint`     | `?blueprint=<json-or-base64>`            | Inline blueprint (JSON, base64, or `data:` URL). |
| `blueprint-url` | `?blueprint-url=/path/to/blueprint.json` | Load a remote or local blueprint file. Supports ZIP bundles. |

### Quick setup shortcuts

These parameters auto-generate a blueprint — no JSON file needed:

| Parameter       | Example                                  | Description |
|-----------------|------------------------------------------|-------------|
| `plugin`        | `?plugin=mod_board`                      | Install a plugin (repeatable: `?plugin=mod_board&plugin=block_participants`). |
| `theme`         | `?theme=moove`                           | Install and activate a theme. |
| `lang`          | `?lang=es`                               | Set the site default language. Also accepts `language`. |
| `url`           | `?url=/course/view.php?id=2`             | Set the landing page after boot. |
| `login`         | `?login=no`                              | Skip the automatic admin login. |

### Display modes

| Parameter       | Example                                  | Description |
|-----------------|------------------------------------------|-------------|
| `mode`          | `?mode=seamless`                         | Hide the toolbar and sidebar for embedding. |
| `lazy`          | `?lazy=true`                             | Show a splash screen; defer boot until the user clicks Start. |

### Advanced

| Parameter       | Example                                  | Description |
|-----------------|------------------------------------------|-------------|
| `import-site`   | `?import-site=https://example.com/site.zip` | Import a site ZIP at boot. |
| `moodle-pr`     | `?moodle-pr=12345`                       | Boot with a Moodle core pull request applied. |
| `mcp`           | `?mcp=yes`                               | Enable the MCP bridge for AI agent control. |
| `debug`         | `?debug=true`                            | Force developer debug mode for this boot. |

All parameters can be combined freely. Version and blueprint parameters are also exposed as controls in the Settings panel.

## First blueprint

Blueprints are small JSON files that **describe how a playground instance should look at boot**. They run as a sequence of steps — install Moodle, create a user, create a course, enrol the user, and so on.

A minimal example:

```json title="demo.blueprint.json" linenums="1"
{
  "steps": [
    {
      "step": "installMoodle",
      "options": { "siteName": "My Moodle" }
    },
    {
      "step": "login",
      "username": "admin"
    },
    {
      "step": "createCourse",
      "fullname": "Demo",
      "shortname": "DEMO1",
      "category": "Miscellaneous"
    }
  ]
}
```

Load it directly via URL:

```
http://localhost:8080/?blueprint-url=/path/to/demo.blueprint.json
```

### Where blueprints live

| Path                                    | Purpose |
|-----------------------------------------|---------|
| `assets/blueprints/default.blueprint.json` | The default blueprint loaded when no URL override is given. |
| `assets/blueprints/examples/`              | Example blueprints shipped with the project. |

## AI assistant integration

Control the playground from Claude Code, Cursor, or other AI tools:

```bash
npx @moodle-playground/mcp-server
```

This connects your AI assistant to the playground so you can ask it to create
courses, install plugins, and manage Moodle — all through natural language.
See the [AI Integration guide](ai-integration.md) for setup details.

## Next steps

- :material-robot: Connect an [AI assistant](ai-integration.md)
- :material-code-braces: Read the full [Blueprint reference](blueprint-json.md)
- :material-image-multiple: Browse the [Blueprint gallery](blueprint-gallery.md)
- :material-sitemap: Understand the [Architecture](architecture.md)
- :material-hammer-wrench: Set up a [development environment](development.md)
