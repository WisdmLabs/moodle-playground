# Execution Plan — Phase 2: Feature Parity with WordPress Playground

**Created:** 2026-04-30
**Baseline:** Moodle Playground fork (ateeducacion/moodle-playground) with Phase 1 complete (OPFS persistence, cron simulation, CSS/JS fixes, blueprint gallery).
**Goal:** Close the 18 feature gaps identified in the WP Playground comparison.

---

## Workstream Overview

| WS  | Name                        | Priority | Effort   | Duration | Dependencies |
|-----|-----------------------------|----------|----------|----------|--------------|
| WS5 | Query Param Shortcuts       | P0       | Low      | 2-3 days | None         |
| WS6 | Site Export/Import as ZIP    | P0       | Medium   | 1 week   | None         |
| WS7 | New Blueprint Steps         | P1       | Medium   | 1 week   | None         |
| WS8 | Display Modes & Lazy Boot   | P1       | Medium   | 1 week   | None         |
| WS9 | Shareable URLs & Embedding  | P1       | High     | 2 weeks  | WS6          |
| WS10| JavaScript Client Library   | P2       | High     | 2 weeks  | WS8, WS9     |
| WS11| GitHub Integration          | P2       | High     | 2 weeks  | WS6          |
| WS12| Advanced Features           | P3       | High     | 3 weeks  | WS7          |

**Estimated total:** 10-12 weeks (with parallelism: 6-8 weeks)

**Parallelism:** WS5 + WS6 + WS7 + WS8 can run in parallel. WS9 starts after WS6. WS10 starts after WS8+WS9. WS11 starts after WS6. WS12 starts after WS7.

```
Week 1-2:  WS5 ━━━┓  WS6 ━━━━━━━┓  WS7 ━━━━━━━┓  WS8 ━━━━━━━┓
Week 3-4:         ┃             ┗━ WS9 ━━━━━━━━┓┃             ┗━ WS10 (starts week 4)
Week 5-6:         ┃  WS11 ━━━━━━━━━━━━━━━━━━━━┓┗━━━━━━━━━━━━━┛
Week 7-8:         ┃                            ┗━ WS12 ━━━━━━━━━━━━━━━━━━━━
```

---

## WS5: Query Param Shortcuts (P0, 2-3 days)

**Goal:** Add `?plugin=`, `?theme=`, `?mode=`, `?login=`, `?url=`, `?lazy=` URL parameters — the most common WP Playground params that let users share one-click install links without writing blueprint JSON.

### Task 5.1: Extend query parameter parsing

**File:** `src/shared/version-resolver.js`

Add new params to `parseQueryParams()` (line ~358):

```javascript
// New params to add:
plugin: params.getAll("plugin"),          // repeatable: ?plugin=mod_board&plugin=mod_exeweb
theme: params.get("theme"),               // ?theme=moove
url: params.get("url"),                   // ?url=/course/view.php?id=2
mode: params.get("mode"),                 // ?mode=seamless
login: params.get("login"),               // ?login=no (default: yes)
lazy: params.get("lazy"),                 // ?lazy=true (defer boot)
lang: params.get("lang") || params.get("language"),  // ?lang=es
```

**Tests:** Add to `tests/shared/version-resolver.test.js` — verify each new param is parsed correctly, `plugin` returns array, defaults are null.

### Task 5.2: Auto-generate blueprint from query params

**File:** `src/blueprint/resolver.js`

After the existing resolution chain (line ~102), if no blueprint was found but query params contain `plugin`/`theme`/`url`, synthesize a blueprint on the fly:

```javascript
function buildBlueprintFromParams(queryParams) {
  const steps = [{ step: "installMoodle" }];

  if (queryParams.login !== "no") {
    steps.push({ step: "login", username: "admin" });
  }

  for (const pluginUrl of queryParams.plugin || []) {
    steps.push({ step: "installMoodlePlugin", pluginUrl });
  }

  if (queryParams.theme) {
    steps.push({ step: "setTheme", theme: queryParams.theme });
  }

  if (queryParams.lang) {
    steps.push({ step: "setSiteLanguage", language: queryParams.lang });
  }

  return {
    preferredVersions: { php: queryParams.php || "8.3", moodle: queryParams.moodle || "5.0" },
    landingPage: queryParams.url || "/my/",
    steps,
  };
}
```

Insert into resolution chain between "config default" and "built-in minimal" fallback. Query param blueprint takes lower priority than explicit `?blueprint=` or `?blueprint-url=`.

**Tests:** Add to `tests/blueprint/resolver.test.js` — verify `?plugin=mod_board` generates correct blueprint, multiple plugins, theme+plugin combo, `?login=no` skips login step.

### Task 5.3: Pass mode/lazy params to shell

**File:** `src/shell/main.js`

Read `mode` and `lazy` from query params. For `?mode=seamless`, add `is-seamless` class to `<body>` which hides the toolbar. For `?lazy=`, defer boot (see WS8).

**File:** `src/styles/app.css`

```css
body.is-seamless .browser-toolbar,
body.is-seamless .side-panel { display: none; }
body.is-seamless .viewport { height: 100vh; }
```

### Key files

| File | Change |
|------|--------|
| `src/shared/version-resolver.js` | Add 6 new params to `parseQueryParams()` |
| `src/blueprint/resolver.js` | Add `buildBlueprintFromParams()`, insert in resolution chain |
| `src/shell/main.js` | Read `mode`/`lazy` params, apply seamless class |
| `src/styles/app.css` | `.is-seamless` styles |
| `tests/shared/version-resolver.test.js` | New param tests |
| `tests/blueprint/resolver.test.js` | Param-to-blueprint tests |

---

## WS6: Site Export/Import as ZIP (P0, 1 week)

**Goal:** Let users download their full playground state as a `.zip` file and re-import it later. WP Playground's most-used feature after blueprints.

### Task 6.1: Build state snapshot collector

**File:** `src/persistence/snapshot.js` (new)

Collect all mutable state from the PHP WASM runtime:

```javascript
export async function collectSnapshot(php, options = {}) {
  const snapshot = {
    version: 1,
    timestamp: Date.now(),
    moodleVersion: options.moodleBranch || "unknown",
    phpVersion: options.phpVersion || "unknown",
  };

  // 1. SQLite database file
  snapshot.dbFile = {
    path: options.dbFilePath,
    data: php.readFileAsBuffer(options.dbFilePath),
  };

  // 2. User uploads (filedir)
  snapshot.filedir = collectDirectory(php, "/persist/moodledata/filedir");

  // 3. Installed plugins (non-core)
  snapshot.plugins = collectInstalledPlugins(php, options.webRoot);

  // 4. Modified config values (optional)
  snapshot.blueprint = options.activeBlueprint || null;

  return snapshot;
}

function collectDirectory(php, dirPath) {
  // Recursive MEMFS traversal, skip symlinks and empty dirs
  // Returns array of { path, data: Uint8Array }
}
```

**Leverage existing code:** `crash-recovery.js:117-150` already does snapshot collection for crash recovery. Extract shared helpers from `createSnapshotManager()` — the crash recovery code already walks `PLUGIN_TYPE_DIRS` and `filedir`.

### Task 6.2: ZIP creation and download

**File:** `src/persistence/export.js` (new)

Use the existing `fflate` dependency (already in package.json) to create ZIP:

```javascript
import { zipSync } from "fflate";

export function createPlaygroundZip(snapshot) {
  const files = {};

  // DB file at root
  files["database/moodle.sq3"] = snapshot.dbFile.data;

  // filedir preserving directory structure
  for (const file of snapshot.filedir) {
    files[`filedir/${file.path}`] = file.data;
  }

  // Plugins
  for (const file of snapshot.plugins) {
    files[`plugins/${file.path}`] = file.data;
  }

  // Metadata
  files["playground.json"] = new TextEncoder().encode(
    JSON.stringify({
      version: snapshot.version,
      timestamp: snapshot.timestamp,
      moodleVersion: snapshot.moodleVersion,
      phpVersion: snapshot.phpVersion,
      blueprint: snapshot.blueprint,
    }, null, 2)
  );

  return zipSync(files);
}
```

### Task 6.3: ZIP import and restore

**File:** `src/persistence/import.js` (new)

```javascript
import { unzipSync } from "fflate";

export async function importPlaygroundZip(zipBuffer, php, options) {
  const files = unzipSync(new Uint8Array(zipBuffer));

  // 1. Read metadata
  const metadata = JSON.parse(new TextDecoder().decode(files["playground.json"]));

  // 2. Write DB file to MEMFS
  const dbData = files["database/moodle.sq3"];
  if (dbData) {
    php.writeFile(options.dbFilePath, dbData);
  }

  // 3. Restore filedir
  for (const [path, data] of Object.entries(files)) {
    if (path.startsWith("filedir/")) {
      const target = `/persist/moodledata/${path}`;
      ensureDirectory(php, dirname(target));
      php.writeFile(target, data);
    }
  }

  // 4. Restore plugins
  for (const [path, data] of Object.entries(files)) {
    if (path.startsWith("plugins/")) {
      const target = `${options.webRoot}/${path.replace("plugins/", "")}`;
      ensureDirectory(php, dirname(target));
      php.writeFile(target, data);
    }
  }

  return metadata;
}
```

### Task 6.4: UI — Export & Import buttons

**File:** `index.html`

Add to the Info panel (near existing "Reset Playground" button):

```html
<button type="button" id="export-site-button">Export Site (.zip)</button>
<label class="import-site-button" for="import-site-input">Import Site (.zip)</label>
<input id="import-site-input" type="file" accept=".zip" hidden>
```

**File:** `src/shell/main.js`

Wire up:
- Export button: send `site-export` message to worker -> worker calls `collectSnapshot()` + `createPlaygroundZip()` -> returns blob -> shell triggers download
- Import button: read file -> send `site-import` message with ArrayBuffer -> worker calls `importPlaygroundZip()` -> reload page

**File:** `php-worker.js`

Handle `site-export` and `site-import` messages:
- Export: collect state, create ZIP, postMessage back with blob
- Import: unzip, write files, signal shell to reload

### Task 6.5: Worker-side message handling

**File:** `php-worker.js`

```javascript
// In message handler:
case "site-export": {
  const snapshot = await collectSnapshot(php, {
    dbFilePath, moodleBranch, phpVersion, webRoot, activeBlueprint
  });
  const zipData = createPlaygroundZip(snapshot);
  postShell({ kind: "site-export-complete", data: zipData.buffer }, [zipData.buffer]);
  break;
}
case "site-import": {
  const metadata = await importPlaygroundZip(msg.data, php, { dbFilePath, webRoot });
  postShell({ kind: "site-import-complete", metadata });
  break;
}
```

### Key files

| File | Change |
|------|--------|
| `src/persistence/snapshot.js` | New — state collector |
| `src/persistence/export.js` | New — ZIP creation |
| `src/persistence/import.js` | New — ZIP import/restore |
| `php-worker.js` | Handle `site-export`/`site-import` messages |
| `src/shell/main.js` | Export/Import button handlers |
| `src/remote/main.js` | Forward export/import messages |
| `index.html` | Export/Import buttons in Info panel |
| `tests/persistence/export.test.js` | New — ZIP creation tests |
| `tests/persistence/import.test.js` | New — ZIP import tests |

---

## WS7: New Blueprint Steps (P1, 1 week)

**Goal:** Add missing blueprint step types: `runSql`, `setSiteLanguage`, `resetData`, `restoreCourseBackup`, and blueprint bundle support.

### Task 7.1: `runSql` step

**File:** `src/blueprint/steps/moodle-database.js` (new)

```javascript
export function registerMoodleDatabaseSteps(registerStep) {
  registerStep("runSql", async (step, { php, webRoot }) => {
    const sql = step.sql;
    const code = `
      define('CLI_SCRIPT', true);
      require('${webRoot}/config.php');
      global $DB;
      $DB->execute(${phpString(sql)});
      echo json_encode(['success' => true]);
    `;
    return php.run({ code });
  });

  registerStep("runSqlFile", async (step, { php, webRoot, resolveResource }) => {
    const sqlContent = await resolveResource(step.file);
    // Split by semicolons, execute each statement
    const code = `
      define('CLI_SCRIPT', true);
      require('${webRoot}/config.php');
      global $DB;
      $statements = explode(';', ${phpString(sqlContent)});
      foreach ($statements as $stmt) {
        $stmt = trim($stmt);
        if ($stmt !== '') { $DB->execute($stmt); }
      }
    `;
    return php.run({ code });
  });
}
```

**Register in:** `src/blueprint/steps/index.js` — import and call `registerMoodleDatabaseSteps`.

**Tests:** `tests/blueprint/steps/database.test.js` — mock `php.run()`, verify correct PHP code generation for single SQL, multi-statement, and SQL file.

### Task 7.2: `setSiteLanguage` step

**File:** `src/blueprint/steps/moodle-config.js` (extend existing)

```javascript
registerStep("setSiteLanguage", async (step, { php, webRoot }) => {
  const lang = step.language; // e.g. "es", "fr", "de"
  const code = `
    define('CLI_SCRIPT', true);
    require('${webRoot}/config.php');
    set_config('lang', ${phpString(lang)});
    // Download language pack if networking available
    if (!empty($CFG->phpCorsProxyUrl) || function_exists('curl_init')) {
      require_once($CFG->libdir . '/componentlib.class.php');
      try {
        // Moodle lang pack download (graceful failure if offline)
      } catch (Exception $e) {
        mtrace('Language pack download failed (offline): ' . $e->getMessage());
      }
    }
    echo json_encode(['success' => true, 'language' => ${phpString(lang)}]);
  `;
  return php.run({ code });
});
```

**Tests:** Verify lang config is set, graceful failure when offline.

### Task 7.3: `resetData` step

**File:** `src/blueprint/steps/moodle-database.js` (add to same file as 7.1)

```javascript
registerStep("resetData", async (step, { php, webRoot }) => {
  const targets = step.targets || ["courses", "users"]; // what to clear
  const code = `
    define('CLI_SCRIPT', true);
    require('${webRoot}/config.php');
    global $DB;
    ${targets.includes("courses") ? "$DB->delete_records_select('course', 'id > 1');" : ""}
    ${targets.includes("users") ? "$DB->delete_records_select('user', \"id > 2 AND deleted = 0\");" : ""}
    ${targets.includes("categories") ? "$DB->delete_records_select('course_categories', 'id > 1');" : ""}
    purge_all_caches();
    echo json_encode(['success' => true]);
  `;
  return php.run({ code });
});
```

### Task 7.4: Blueprint bundle (ZIP) support

**File:** `src/blueprint/resolver.js`

When `?blueprint-url=` points to a `.zip` file:

```javascript
async function resolveFromUrl(url) {
  const response = await fetch(url);
  const contentType = response.headers.get("content-type") || "";

  if (url.endsWith(".zip") || contentType.includes("zip")) {
    return resolveBundleZip(response);
  }

  return response.json();
}

async function resolveBundleZip(response) {
  const { unzipSync } = await import("fflate");
  const buffer = await response.arrayBuffer();
  const files = unzipSync(new Uint8Array(buffer));

  // Find blueprint.json at root
  const blueprintData = files["blueprint.json"];
  if (!blueprintData) throw new Error("No blueprint.json found in bundle");

  const blueprint = JSON.parse(new TextDecoder().decode(blueprintData));

  // Register bundled resources for use by steps
  blueprint._bundledFiles = {};
  for (const [path, data] of Object.entries(files)) {
    if (path !== "blueprint.json") {
      blueprint._bundledFiles[path] = data;
    }
  }

  return blueprint;
}
```

**File:** `src/blueprint/resources.js`

Add a `bundled` resource type that reads from `blueprint._bundledFiles`:

```javascript
registerResourceType("bundled", async (ref, context) => {
  const bundledFiles = context.blueprint?._bundledFiles;
  if (!bundledFiles || !bundledFiles[ref.path]) {
    throw new Error(`Bundled resource not found: ${ref.path}`);
  }
  return bundledFiles[ref.path];
});
```

### Task 7.5: `defineConfigConstants` step

**File:** `src/blueprint/steps/moodle-config.js` (extend)

Write PHP constants to `config.php` — Moodle equivalent of WP's `defineWpConfigConsts`:

```javascript
registerStep("defineConfigConstants", async (step, { php, webRoot }) => {
  const constants = step.constants; // { "MOODLE_INTERNAL_TEST": true, "CUSTOM_FLAG": "value" }
  // Read current config.php, insert define() lines before the require_once at the end
  const configPath = `${webRoot}/config.php`;
  let config = new TextDecoder().decode(php.readFileAsBuffer(configPath));

  const defines = Object.entries(constants)
    .map(([k, v]) => `define('${k}', ${typeof v === "string" ? `'${v}'` : v});`)
    .join("\n");

  // Insert before the final require_once line
  config = config.replace(
    /require_once\(__DIR__\s*\.\s*'\/lib\/setup\.php'\);/,
    `${defines}\nrequire_once(__DIR__ . '/lib/setup.php');`
  );

  php.writeFile(configPath, config);
});
```

### Key files

| File | Change |
|------|--------|
| `src/blueprint/steps/moodle-database.js` | New — `runSql`, `runSqlFile`, `resetData` steps |
| `src/blueprint/steps/moodle-config.js` | Add `setSiteLanguage`, `defineConfigConstants` |
| `src/blueprint/steps/index.js` | Register new step modules |
| `src/blueprint/resolver.js` | ZIP bundle support in `resolveFromUrl()` |
| `src/blueprint/resources.js` | `bundled` resource type |
| `tests/blueprint/steps/database.test.js` | New tests |
| `tests/blueprint/steps/config-extended.test.js` | New tests |
| `tests/blueprint/resolver.test.js` | Bundle ZIP tests |

---

## WS8: Display Modes & Lazy Boot (P1, 1 week)

**Goal:** Support seamless display mode (no toolbar) for embedding, and lazy boot that defers WASM loading until user interaction.

### Task 8.1: Seamless display mode

**File:** `src/shell/main.js`

At startup, read `?mode=` param:

```javascript
const displayMode = new URLSearchParams(location.search).get("mode") || "browser-full-screen";

if (displayMode === "seamless") {
  document.body.classList.add("is-seamless");
}
```

**File:** `src/styles/app.css`

```css
body.is-seamless .shell { display: contents; }
body.is-seamless .browser-toolbar { display: none; }
body.is-seamless .side-panel { display: none; }
body.is-seamless #workspace { grid-template-columns: 1fr; }
body.is-seamless .viewport { height: 100vh; width: 100vw; }
body.is-seamless .viewport iframe { border: none; }
```

**File:** `src/remote/main.js`

In seamless mode, the iframe fills the full viewport. The remote frame should also suppress any internal chrome if present.

### Task 8.2: Lazy boot

**File:** `src/shell/main.js`

When `?lazy=true`, show a splash screen instead of immediately booting. Build all DOM with safe `createElement`/`textContent` methods (no innerHTML):

```javascript
const isLazy = new URLSearchParams(location.search).get("lazy") === "true";

if (isLazy) {
  showLazySplash();
} else {
  bootPlayground();
}

function showLazySplash() {
  const splash = document.createElement("div");
  splash.className = "lazy-splash";

  const title = document.createElement("h2");
  title.textContent = "Moodle Playground";
  const subtitle = document.createElement("p");
  subtitle.textContent = "Click to start";
  const btn = document.createElement("button");
  btn.textContent = "Launch Moodle";
  btn.addEventListener("click", () => {
    splash.remove();
    bootPlayground();
  });
  splash.append(title, subtitle, btn);
  document.querySelector(".viewport").append(splash);
}
```

**File:** `src/styles/app.css`

```css
.lazy-splash {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 1rem;
  background: var(--bg-surface);
  color: var(--text);
}
.lazy-splash button {
  padding: 12px 32px;
  font-size: 16px;
  background: var(--accent);
  color: white;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
}
```

### Task 8.3: Boot refactor — extract `bootPlayground()`

**File:** `src/shell/main.js`

The current `main()` function (line ~559) handles boot + UI setup together. Extract the runtime boot into a standalone `bootPlayground()` function that can be called lazily:

```javascript
async function main() {
  // UI setup, event listeners, panel tabs — always runs
  setupUI();

  const isLazy = new URLSearchParams(location.search).get("lazy") === "true";
  if (isLazy) {
    showLazySplash();
  } else {
    bootPlayground();
  }
}

function bootPlayground() {
  // Load config, resolve blueprint, set iframe src, listen for worker messages
  // (current main() body from line ~561 onward)
}
```

### Key files

| File | Change |
|------|--------|
| `src/shell/main.js` | `displayMode` handling, `showLazySplash()`, extract `bootPlayground()` |
| `src/styles/app.css` | `.is-seamless` rules, `.lazy-splash` styles |
| `src/remote/main.js` | Seamless mode awareness |
| `tests/e2e/shell.spec.mjs` | E2E tests for `?mode=seamless` and `?lazy=true` |

---

## WS9: Shareable URLs & Embedding (P1, 2 weeks)

**Goal:** Let users generate shareable URLs that encode playground state, and provide a documented embedding API for third-party websites.

### Task 9.1: State URL encoding

**File:** `src/persistence/share.js` (new)

Two sharing strategies:

**Strategy A — Blueprint URL (lightweight):**
Encode the current active blueprint as base64 in the URL fragment:

```javascript
export function generateShareUrl(blueprint, baseUrl) {
  const json = JSON.stringify(blueprint);
  const encoded = btoa(unescape(encodeURIComponent(json)));
  return `${baseUrl}#${encoded}`;
}
```

**Strategy B — Full state URL (heavyweight):**
Export site as ZIP, encode for small states or prompt user to host for large ones:

```javascript
export async function generateFullShareUrl(zipBlob, baseUrl) {
  // For small states (< 1MB): data URL approach
  if (zipBlob.size < 1_048_576) {
    const buffer = await zipBlob.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
    return `${baseUrl}?import-site=data:application/zip;base64,${base64}`;
  }

  // For larger states: user must host the ZIP themselves
  return null; // Prompt user to upload ZIP and use ?import-site=<url>
}
```

### Task 9.2: URL fragment blueprint loading

**File:** `src/blueprint/resolver.js`

Support loading blueprints from URL hash (like WP Playground):

```javascript
function resolveFromFragment(location) {
  const hash = location.hash?.slice(1);
  if (!hash) return null;

  try {
    // Try JSON first
    return JSON.parse(decodeURIComponent(hash));
  } catch {
    // Try base64
    try {
      const json = decodeURIComponent(escape(atob(hash)));
      return JSON.parse(json);
    } catch {
      return null;
    }
  }
}
```

Add to resolution chain before query param check.

### Task 9.3: `?import-site=` query parameter

**File:** `src/shared/version-resolver.js`

Add `importSite` to `parseQueryParams()`:

```javascript
importSite: params.get("import-site") || null,  // URL to .zip file
```

**File:** `src/blueprint/resolver.js` or `src/runtime/bootstrap.js`

When `?import-site=` is present, download the ZIP and restore before running any blueprint:

```javascript
if (queryParams.importSite) {
  const response = await fetch(queryParams.importSite);
  const buffer = await response.arrayBuffer();
  await importPlaygroundZip(buffer, php, options);
}
```

### Task 9.4: Share button in UI

**File:** `index.html`

Add a Share button to the toolbar:

```html
<button type="button" id="share-button" class="icon-button" aria-label="Share playground" title="Share">
  <!-- share icon SVG -->
</button>
```

**File:** `src/shell/main.js`

On click, generate a share URL and show a popover with:
- Copy URL button
- "Blueprint only" vs "Full state" toggle (if state is small enough)
- Download ZIP option as fallback for large states

### Task 9.5: Embedding documentation

**File:** `docs/embedding.md` (new)

Document how to embed a Moodle Playground on any website:

```html
<!-- Basic embed -->
<iframe
  src="https://moodle-playground.com/?mode=seamless"
  style="width: 100%; height: 600px; border: none;"
></iframe>

<!-- With blueprint -->
<iframe
  src="https://moodle-playground.com/?mode=seamless&blueprint-url=https://example.com/my-blueprint.json"
  style="width: 100%; height: 600px; border: none;"
></iframe>

<!-- With plugin pre-installed -->
<iframe
  src="https://moodle-playground.com/?mode=seamless&plugin=mod_board&url=/course/view.php?id=2"
  style="width: 100%; height: 600px; border: none;"
></iframe>
```

### Key files

| File | Change |
|------|--------|
| `src/persistence/share.js` | New — URL generation |
| `src/blueprint/resolver.js` | URL fragment resolution, `?import-site=` handling |
| `src/shared/version-resolver.js` | Add `importSite` param |
| `src/shell/main.js` | Share button handler, share popover |
| `index.html` | Share button in toolbar |
| `src/styles/app.css` | Share popover styles |
| `docs/embedding.md` | New — embedding guide |

---

## WS10: JavaScript Client Library (P2, 2 weeks)

**Goal:** Publish an npm package (`@edwiser/moodle-playground-client`) that lets developers embed and programmatically control Moodle Playground instances.

### Task 10.1: Define the client API

**File:** `packages/client/src/index.js` (new package)

```javascript
export async function startMoodlePlayground(iframe, options = {}) {
  const {
    remoteUrl = "https://moodle-playground.com/remote.html",
    blueprint = null,
    moodleVersion = "5.0",
    phpVersion = "8.3",
    mode = "seamless",
    lazy = false,
  } = options;

  // Build URL with query params
  const url = new URL(remoteUrl);
  url.searchParams.set("php", phpVersion);
  url.searchParams.set("moodle", moodleVersion);
  url.searchParams.set("mode", mode);
  if (lazy) url.searchParams.set("lazy", "true");
  if (blueprint) {
    url.searchParams.set("blueprint", btoa(JSON.stringify(blueprint)));
  }

  iframe.src = url.toString();

  // Return API handle
  return createPlaygroundClient(iframe);
}

function createPlaygroundClient(iframe) {
  const channel = new MessageChannel();

  return {
    async isReady() { /* wait for ready message */ },
    async navigate(path) { /* send navigation message */ },
    async runPhp(code) { /* send PHP execution message */ },
    async listFiles(dir) { /* send fs message */ },
    async readFile(path) { /* send fs message */ },
    async writeFile(path, data) { /* send fs message */ },
    async exportSite() { /* trigger ZIP export */ },
    async importSite(zipBlob) { /* trigger ZIP import */ },
    destroy() { iframe.src = "about:blank"; },
  };
}
```

### Task 10.2: PostMessage bridge

**File:** `src/remote/main.js`

Add a `postMessage` listener for client API commands:

```javascript
window.addEventListener("message", async (event) => {
  if (event.data?.source !== "moodle-playground-client") return;

  switch (event.data.type) {
    case "navigate":
      // Update iframe src
      break;
    case "run-php":
      // Forward to worker
      break;
    case "list-files":
    case "read-file":
    case "write-file":
      // Forward to worker, return result
      break;
    case "export-site":
    case "import-site":
      // Forward to worker
      break;
  }
});
```

### Task 10.3: Package setup

```
packages/
  client/
    package.json    # name: "@edwiser/moodle-playground-client", main, module, types
    src/index.js
    src/types.d.ts  # TypeScript declarations
    README.md
    tsconfig.json
```

**package.json:**
```json
{
  "name": "@edwiser/moodle-playground-client",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.cjs",
  "module": "dist/index.mjs",
  "types": "dist/index.d.ts",
  "exports": {
    ".": { "import": "./dist/index.mjs", "require": "./dist/index.cjs" }
  }
}
```

### Task 10.4: Documentation

**File:** `docs/javascript-api.md` (new)

Document the full client API with usage examples.

### Key files

| File | Change |
|------|--------|
| `packages/client/` | New package directory |
| `src/remote/main.js` | PostMessage bridge for client commands |
| `php-worker.js` | Handle client-forwarded messages |
| `docs/javascript-api.md` | New — API documentation |

---

## WS11: GitHub Integration (P2, 2 weeks)

**Goal:** Add GitHub export (push playground state to a repo) and PR-based query params for Moodle core testing.

### Task 11.1: `?moodle-pr=` query parameter

**File:** `src/shared/version-resolver.js`

Add `moodlePr` to `parseQueryParams()`:

```javascript
moodlePr: params.get("moodle-pr") || null,  // Moodle tracker issue / GitHub PR number
```

**File:** `src/blueprint/resolver.js`

When `?moodle-pr=N` is specified, build a blueprint that patches the Moodle source with the PR's diff:

```javascript
if (queryParams.moodlePr) {
  steps.push({
    step: "runPhpCode",
    code: `// Apply PR patch from GitHub
      $patchUrl = "https://github.com/moodle/moodle/pull/${queryParams.moodlePr}.diff";
      // Download and apply patch...
    `
  });
}
```

**Note:** This is complex because Moodle core is extracted from a prebuilt ZIP. A simpler MVP is to document how to use blueprint `writeFile` steps to apply individual file changes.

### Task 11.2: GitHub export button

**File:** `src/shell/main.js`

Add a "Push to GitHub" option in the Share popover (from WS9). Flow:

1. User clicks "Export to GitHub"
2. Popup opens GitHub OAuth flow (or ask for a PAT)
3. User selects repo + branch
4. Site state is exported as a ZIP (reuse WS6)
5. ZIP contents are committed to the repo via GitHub API

**Implementation:** Use GitHub's REST API via `fetch()`:
- Create/update files via `PUT /repos/{owner}/{repo}/contents/{path}`
- Or create a tree + commit via the Git Data API for bulk uploads

**This is a large feature.** MVP could be simpler: export a `.zip` and provide a one-click "Create GitHub Gist" with the blueprint JSON only.

### Task 11.3: GitHub OAuth flow

**File:** `src/shell/github-auth.js` (new)

```javascript
export async function authenticateGitHub() {
  // OAuth app flow requires a backend for the token exchange
  // Alternative: ask user for a Personal Access Token
  // Validate token against GitHub API
  const response = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) throw new Error("Invalid token");
  return { token, user: await response.json() };
}
```

### Key files

| File | Change |
|------|--------|
| `src/shared/version-resolver.js` | Add `moodlePr` param |
| `src/blueprint/resolver.js` | PR-based blueprint generation |
| `src/shell/github-auth.js` | New — GitHub auth |
| `src/shell/github-export.js` | New — push state to GitHub |
| `src/shell/main.js` | GitHub export UI in share popover |

---

## WS12: Advanced Features (P3, 3 weeks)

**Goal:** Implement MCP server bridge, Moodle course backup restore, and multisite-style isolated instances.

### Task 12.1: MCP server bridge

**Concept:** A WebSocket bridge that lets AI agents (Claude Code, Cursor, etc.) control the playground programmatically. WP Playground exposes this via `?mcp=yes&mcp-port=7999`.

**File:** `src/mcp/bridge.js` (new)

In browser context, we cannot open a WebSocket server directly. Two approaches:

**Approach A (MVP):** Expose a postMessage-based MCP endpoint that works when the playground is embedded in an IDE extension (VS Code, JetBrains). The host extension translates between MCP protocol and postMessage.

**Approach B (Full):** A local Node.js proxy script (shipped as CLI tool) opens a WS server on the specified port and communicates with the browser tab via Chrome DevTools Protocol or a shared extension.

MVP implementation: support MCP via the postMessage client API (WS10), usable from VS Code extensions or Node.js test harnesses.

### Task 12.2: Course backup restore (`restoreCourseBackup` step)

**File:** `src/blueprint/steps/moodle-backup.js` (new)

Moodle's equivalent of WXR import — restore a `.mbz` course backup:

```javascript
registerStep("restoreCourseBackup", async (step, { php, webRoot, resolveResource }) => {
  // 1. Download/resolve the .mbz file
  const mbzData = await resolveResource(step.file);

  // 2. Write to temp location in MEMFS
  const tempPath = "/tmp/moodle/restore_backup.mbz";
  php.writeFile(tempPath, mbzData);

  // 3. Execute Moodle's restore CLI
  const code = `
    define('CLI_SCRIPT', true);
    require('${webRoot}/config.php');
    require_once($CFG->dirroot . '/backup/util/includes/restore_includes.php');

    $admin = get_admin();
    $categoryid = ${step.categoryId || 1};

    // Extract backup to temp dir
    $tempdir = make_backup_temp_directory('playground_restore');
    $fb = get_file_packer('application/vnd.moodle.backup');
    $fb->extract_to_pathname('${tempPath}', $tempdir);

    // Create restore controller
    $controller = new restore_controller(
      'playground_restore',
      $categoryid,
      backup::INTERACTIVE_NO,
      backup::MODE_GENERAL,
      $admin->id,
      backup::TARGET_NEW_COURSE
    );

    $controller->execute_precheck();
    $controller->execute_plan();
    $controller->destroy();

    echo json_encode(['success' => true, 'courseid' => $controller->get_courseid()]);
  `;
  return php.run({ code });
});
```

**Risk:** Moodle's backup/restore system is complex and may have SQLite compatibility issues. Needs careful testing.

### Task 12.3: Multi-instance support

**Concept:** Run multiple isolated Moodle instances in the same browser tab, each with its own scope/DB.

**Current state:** The scoped runtime system (`/playground/{scope}/{runtime}/...`) already supports this architecturally. Each scope gets its own DB file path: `/persist/moodledata/moodle_{scope}_{runtime}.sq3.php`.

**What's needed:**
1. **Instance manager UI** — a panel listing active instances with create/switch/delete
2. **Scope isolation verification** — ensure Service Worker correctly routes requests per scope
3. **Instance-specific blueprints** — each instance can have its own blueprint

**File:** `src/shell/instance-manager.js` (new)

```javascript
export class InstanceManager {
  constructor() {
    this.instances = new Map(); // scopeId -> { blueprint, moodleVersion, phpVersion, status }
  }

  async createInstance(options) {
    const scopeId = crypto.randomUUID().slice(0, 8);
    // Create a new iframe or reuse the existing one with a new scope
    // The scoped URL pattern already handles isolation
  }

  async switchInstance(scopeId) {
    // Update iframe src to point to the new scope
  }

  async deleteInstance(scopeId) {
    // Clear OPFS/IndexedDB for this scope
  }
}
```

### Key files

| File | Change |
|------|--------|
| `src/mcp/bridge.js` | New — MCP bridge (MVP: postMessage-based) |
| `src/blueprint/steps/moodle-backup.js` | New — `restoreCourseBackup` step |
| `src/blueprint/steps/index.js` | Register backup steps |
| `src/shell/instance-manager.js` | New — multi-instance management |
| `src/shell/main.js` | Instance manager UI |
| `index.html` | Instance panel UI |

---

## Risk Register

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| ZIP export too large for memory | High | Medium | Stream ZIP creation with fflate, cap at 100MB, warn user |
| Course backup restore fails on SQLite | High | High | Test with minimal .mbz files, patch restore code for SQLite compat |
| MCP bridge needs local proxy | Medium | High | MVP: postMessage-only, defer WebSocket to a companion CLI tool |
| GitHub OAuth needs backend | Medium | High | Use PAT-based auth instead of OAuth app flow |
| Seamless mode breaks Moodle navigation | Medium | Low | Test with all Moodle internal link patterns |
| Lazy boot + blueprint-url race condition | Medium | Medium | Ensure blueprint is fetched before boot, not during |
| Client library versioning | Low | Medium | Semantic versioning, document breaking changes |
| Language pack download needs networking | Low | Medium | Graceful fallback: set config only, skip pack download |

---

## Implementation Order

**Phase 2a (weeks 1-2):** WS5 + WS6 + WS7 + WS8 in parallel
- 4 independent workstreams, no dependencies
- Each can be a separate feature branch

**Phase 2b (weeks 3-4):** WS9 (depends on WS6 for ZIP import/export)
- Shareable URLs and embedding
- Builds on WS6's export mechanism and WS8's seamless mode

**Phase 2c (weeks 5-6):** WS10 + WS11 in parallel
- Client library (depends on WS8+WS9)
- GitHub integration (depends on WS6)

**Phase 2d (weeks 7-8):** WS12
- Advanced features (MCP, backup restore, multi-instance)
- Depends on WS7 (step registry patterns)

---

## Key File Reference

| Area | Primary Files |
|------|---------------|
| Query params | `src/shared/version-resolver.js`, `src/blueprint/resolver.js` |
| Blueprint steps | `src/blueprint/steps/*.js`, `src/blueprint/steps/index.js` |
| Export/Import | `src/persistence/snapshot.js`, `export.js`, `import.js` |
| Display modes | `src/shell/main.js`, `src/styles/app.css` |
| Sharing | `src/persistence/share.js`, `src/blueprint/resolver.js` |
| Client library | `packages/client/` |
| GitHub | `src/shell/github-auth.js`, `github-export.js` |
| Worker protocol | `php-worker.js`, `src/remote/main.js` |
| Service worker | `sw.js` |
| Tests | `tests/` (mirror source structure) |

---

## Success Criteria

| Metric | Target |
|--------|--------|
| WP Playground feature parity | 90%+ (15 of 18 gaps closed) |
| New blueprint step types | 5+ new steps (runSql, setSiteLanguage, resetData, defineConfigConstants, restoreCourseBackup) |
| Query param shortcuts | 7+ params (?plugin, ?theme, ?url, ?mode, ?lazy, ?login, ?lang) |
| Export/Import round-trip | ZIP export then import produces identical site state |
| Embedding works cross-origin | Seamless iframe on any domain, no CORS issues |
| Client API coverage | navigate, runPhp, readFile, writeFile, exportSite |
| Test coverage | Unit tests for all new modules, E2E for export/import + seamless mode |
