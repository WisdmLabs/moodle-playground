# JavaScript Client API

The `@edwiser/moodle-playground-client` package provides a programmatic API for embedding
and controlling Moodle Playground instances from JavaScript.

## Installation

```bash
npm install @edwiser/moodle-playground-client
```

## Quick Start

```javascript
import { startMoodlePlayground } from '@edwiser/moodle-playground-client';

const iframe = document.createElement('iframe');
iframe.style.cssText = 'width:100%;height:600px;border:none';
document.body.append(iframe);

const playground = await startMoodlePlayground(iframe, {
  moodleVersion: '5.0',
  phpVersion: '8.3',
  mode: 'seamless',
  blueprint: {
    steps: [
      { step: 'installMoodle' },
      { step: 'login', username: 'admin' },
    ],
  },
});

await playground.isReady();
console.log('Moodle is running!');

// Navigate to a course
await playground.navigate('/course/view.php?id=2');

// Clean up
playground.destroy();
```

## API Reference

### `startMoodlePlayground(iframe, options)`

Boots a Moodle Playground instance inside the given iframe element.

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `remoteUrl` | `string` | Production URL | URL of the playground host |
| `blueprint` | `object` | `null` | Blueprint to apply on boot |
| `moodleVersion` | `string` | `"5.0"` | Moodle version |
| `phpVersion` | `string` | `"8.3"` | PHP version |
| `mode` | `string` | `"seamless"` | Display mode |
| `lazy` | `boolean` | `false` | Defer boot |

**Returns:** A playground client handle.

### Client Methods

#### `isReady(): Promise<void>`
Resolves when the Moodle runtime is fully booted and ready.

#### `navigate(path: string): Promise<void>`
Navigate to a URL path within the Moodle site.

#### `runPhp(code: string): Promise<string>`
Execute arbitrary PHP code and return its output.

#### `listFiles(dir: string): Promise<string[]>`
List files in a MEMFS directory.

#### `readFile(path: string): Promise<Uint8Array>`
Read a file from MEMFS.

#### `writeFile(path: string, data: string | Uint8Array): Promise<void>`
Write a file to MEMFS.

#### `exportSite(): Promise<ArrayBuffer>`
Export the full playground state as a ZIP.

#### `importSite(zipBuffer: ArrayBuffer): Promise<void>`
Import a ZIP to restore playground state.

#### `getWebsiteUrl(): Promise<string>`
Get the base URL of the playground instance.

#### `getSiteInfo(): Promise<object>`
Get Moodle site metadata (version, name, PHP version).

#### `getCurrentUrl(): Promise<string>`
Get the current page URL path within Moodle.

#### `resetSite(): Promise<void>`
Reset the playground to a fresh install state. All data is lost.

#### `saveSite(): Promise<ArrayBuffer>`
Save the current site state (alias for `exportSite()`).

#### `mkdir(path: string): Promise<void>`
Create a directory (and parents) in MEMFS.

#### `deleteFile(path: string): Promise<void>`
Delete a file from MEMFS.

#### `deleteDirectory(path: string): Promise<void>`
Delete a directory and its contents from MEMFS.

#### `fileExists(path: string): Promise<boolean>`
Check whether a file or directory exists in MEMFS.

#### `applyBlueprint(blueprint: object): Promise<void>`
Apply a blueprint JSON to configure the running instance.

#### `getBlueprint(): Promise<object>`
Get the currently active blueprint configuration.

#### `setConfig(name: string, value: string, plugin?: string): Promise<void>`
Set a Moodle configuration value. Pass `plugin` for plugin-scoped settings.

#### `installPlugin(url: string, pluginType?: string, pluginName?: string): Promise<void>`
Install a Moodle plugin from a GitHub ZIP URL. Plugin type and name are
auto-detected if not provided.

#### `listSites(): Promise<object[]>`
List all active playground instances.

#### `destroy(): void`
Clean up event listeners and disconnect from the iframe.
