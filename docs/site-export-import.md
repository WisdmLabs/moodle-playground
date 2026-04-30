# Site Export & Import

Export the entire playground state as a ZIP file and restore it later or share
it with others. This lets you preserve a configured Moodle environment beyond
the ephemeral browser session.

## Exporting

Click the **Export Site** button in the info panel (sidebar). The playground
collects:

- The SQLite database file
- Uploaded files (`moodledata/filedir`)
- Third-party plugins installed via blueprint or manually
- A `playground.json` manifest with version metadata

The result is downloaded as a `.zip` file.

### Via the client library

```javascript
const zipBuffer = await playground.exportSite();
```

### Via MCP

```json
{ "method": "tools/call", "params": { "name": "moodle/exportSite" } }
```

## Importing

### From the UI

Click the **Import Site** button in the info panel and select a previously
exported `.zip` file. The playground restores the database, files, and plugins,
then reloads.

### Via URL parameter

Load a ZIP from a remote URL at boot time:

```
https://moodle-playground.com/?import-site=https://example.com/my-site.zip
```

### Via the client library

```javascript
const zipBuffer = await fetch('/my-site.zip').then(r => r.arrayBuffer());
await playground.importSite(zipBuffer);
```

## ZIP Format

The export ZIP follows this structure:

```text
my-site.zip
├── playground.json        # Manifest (moodleVersion, phpVersion, exportDate)
├── database/
│   └── moodle.sq3.php     # SQLite database file
├── filedir/               # Moodle file storage (hashed content files)
│   ├── ab/
│   │   └── cd/
│   │       └── abcdef...  # Content-addressed files
│   └── ...
└── plugins/               # Third-party plugins
    ├── mod/
    │   └── board/          # Plugin directory tree
    └── ...
```

### playground.json

```json
{
  "version": 1,
  "moodleVersion": "5.0",
  "phpVersion": "8.3",
  "exportDate": "2026-04-30T12:00:00.000Z"
}
```

## Limitations

- Exports capture the MEMFS state at the moment of export. Any in-flight PHP
  requests should complete before exporting.
- The ZIP does not include Moodle core files (they come from the prebuilt bundle).
- Importing a ZIP from a different Moodle version may cause upgrade prompts or
  compatibility issues.
- ZIP files are compressed in the browser using fflate. Very large sites may
  be slow to export on memory-constrained devices.
