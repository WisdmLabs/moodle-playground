# @edwiser/moodle-playground-client

Embed and programmatically control Moodle Playground instances.

## Usage

```html
<iframe id="playground" style="width:100%;height:600px;border:none"></iframe>
<script type="module">
  import { startMoodlePlayground } from '@edwiser/moodle-playground-client';

  const iframe = document.getElementById('playground');
  const playground = await startMoodlePlayground(iframe, {
    moodleVersion: '5.0',
    phpVersion: '8.3',
    mode: 'seamless',
  });

  await playground.isReady();
  await playground.navigate('/course/view.php?id=2');
</script>
```

## API

### `startMoodlePlayground(iframe, options)`

- `remoteUrl` -- URL of the playground remote.html (default: production)
- `blueprint` -- Blueprint object to apply
- `moodleVersion` -- Moodle version (default: "5.0")
- `phpVersion` -- PHP version (default: "8.3")
- `mode` -- Display mode (default: "seamless")
- `lazy` -- Defer boot until user interaction (default: false)

Returns a client handle with these methods:

- `isReady()` -- Promise that resolves when the playground is ready
- `navigate(path)` -- Navigate to a Moodle URL path
- `runPhp(code)` -- Execute PHP code and return the output
- `listFiles(dir)` -- List files in a MEMFS directory
- `readFile(path)` -- Read a file from MEMFS
- `writeFile(path, data)` -- Write a file to MEMFS
- `exportSite()` -- Export the playground state as a ZIP
- `importSite(zipBuffer)` -- Import a ZIP to restore state
- `destroy()` -- Clean up and disconnect
