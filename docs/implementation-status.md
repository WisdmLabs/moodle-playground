# Implementation Status

Last updated: 2026-04-30

## Core Runtime

| Feature | Status | Notes |
|---------|--------|-------|
| PHP WASM runtime (`@php-wasm/web`) | Done | PHP 8.1–8.5, default 8.3 |
| Moodle ZIP bundle extraction | Done | ~30k files in ~2s via MEMFS |
| SQLite PDO driver | Done | Deprecated driver restored with patches |
| Pre-built install snapshot | Done | Eliminates 3–8s CLI install |
| Service Worker routing | Done | Scoped runtime under `/playground/<scope>/<runtime>/` |
| Base path handling (GitHub Pages) | Done | Full subpath-aware stack |
| Crash recovery | Done | Auto-restart with DB/file state preservation |
| Config.php generation | Done | Dynamic wwwroot, pragmas, debug settings |

## Blueprint System

| Feature | Status | Notes |
|---------|--------|-------|
| Step-based JSON format | Done | 30+ step types |
| Blueprint resolver (8+ sources) | Done | Hash, inline, URL, query params, PR, import, session, default |
| Constants (`{{KEY}}` substitution) | Done | |
| Named resources | Done | URL, base64, data-URL, bundled, VFS, literal |
| Install & auth steps | Done | `installMoodle`, `setAdminAccount`, `login` |
| User steps | Done | `createUser`, `createUsers` |
| Course steps | Done | `createCourse`, `createCourses`, `createCategory`, `createSection` |
| Enrolment steps | Done | `enrolUser`, `enrolUsers` |
| Module steps | Done | `addModule` with file attachments |
| Plugin/theme install | Done | Auto-detection from GitHub URLs |
| Config steps | Done | `setConfig`, `setConfigs`, `setTheme`, `setLandingPage` |
| Filesystem steps | Done | `writeFile`, `mkdir`, `rmdir`, `copyFile`, `moveFile`, `unzip` |
| Low-level steps | Done | `request`, `runPhpCode`, `runPhpScript` |
| Database steps | Done | `runSql`, `runSqlFile`, `resetData` |
| Language & constants | Done | `setSiteLanguage`, `defineConfigConstants` |
| Course backup restore | Done | `restoreCourseBackup` (.mbz) |
| Patch application | Stub | `applyPatch` planned for future release |

## URL Parameters & Display Modes

| Feature | Status | Notes |
|---------|--------|-------|
| Version selection (`moodle`, `php`) | Done | |
| Blueprint params (`blueprint`, `blueprint-url`) | Done | ZIP bundle support for `blueprint-url` |
| Plugin install (`plugin`) | Done | Repeatable param |
| Theme (`theme`) | Done | |
| Language (`lang`) | Done | |
| Landing page (`url`) | Done | |
| Login control (`login`) | Done | |
| Seamless mode (`mode=seamless`) | Done | Hides toolbar and sidebar |
| Lazy boot (`lazy=true`) | Done | Splash screen with Start button |
| Site import (`import-site`) | Done | |
| PR testing (`moodle-pr`) | Done | |
| MCP bridge (`mcp=yes`) | Done | |

## Site Export & Import

| Feature | Status | Notes |
|---------|--------|-------|
| Snapshot collector | Done | DB, filedir, plugins from MEMFS |
| ZIP export | Done | Uses fflate |
| ZIP import/restore | Done | |
| Export/Import UI buttons | Done | In shell info panel |
| URL-based import (`?import-site=`) | Done | |

## Sharing

| Feature | Status | Notes |
|---------|--------|-------|
| Blueprint hash URLs | Done | Base64 in URL fragment |
| Query param URLs | Done | |
| Share popover UI | Done | Copy button, radio toggle |
| GitHub Gist export | Done | Token-based, generates playground URL |

## Embedding & Integration

| Feature | Status | Notes |
|---------|--------|-------|
| iframe embedding | Done | With `?mode=seamless` |
| JavaScript client library | Done | `@moodle-playground/client` |
| MCP bridge (postMessage) | Done | 7 tools: navigate, runPhp, readFile, writeFile, listFiles, exportSite, importSite |
| WebSocket MCP bridge | Planned | CLI companion tool for stdio/WebSocket |
| Multi-instance manager | Done | Session-scoped instance switching |

## Build & CI

| Feature | Status | Notes |
|---------|--------|-------|
| Multi-branch builds | Done | 5 Moodle branches in parallel |
| Worker bundling (esbuild) | Done | ESM bundle with content-hashed WASM |
| SW bundling (Firefox) | Done | IIFE bundle for classic SW registration |
| GitHub Pages deploy | Done | |
| Netlify PR previews | Done | |
| E2E tests (Playwright) | Done | Chromium + Firefox |
| Unit tests (node:test) | Done | 321+ tests |
| Biome linting | Done | |
