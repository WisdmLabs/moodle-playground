/**
 * State snapshot collector for site export/import.
 *
 * Collects the full playground state (database, user uploads, plugins)
 * into a serializable snapshot object. Uses the raw PHP WASM filesystem
 * API (the same approach as crash-recovery.js).
 *
 * @module persistence/snapshot
 */

/**
 * Collect a complete snapshot of the playground state.
 *
 * @param {object} php - The php-compat wrapper (has ._php for raw FS access)
 * @param {object} [options]
 * @param {string} [options.dbFilePath] - Full path to the SQLite DB file
 * @param {string} [options.moodleBranch] - Current Moodle branch identifier
 * @param {string} [options.phpVersion] - Current PHP version
 * @param {string} [options.webRoot] - Moodle webroot (default "/www/moodle")
 * @param {object} [options.activeBlueprint] - Active blueprint JSON, if any
 * @returns {object} Snapshot descriptor with metadata and file data
 */
export function collectSnapshot(php, options = {}) {
  const rawPhp = php._php || php;
  const webRoot = options.webRoot || "/www/moodle";

  const snapshot = {
    version: 1,
    timestamp: Date.now(),
    moodleVersion: options.moodleBranch || "unknown",
    phpVersion: options.phpVersion || "unknown",
  };

  // 1. SQLite database file
  if (options.dbFilePath) {
    try {
      const data = rawPhp.readFileAsBuffer(options.dbFilePath);
      if (data && data.byteLength > 0) {
        snapshot.dbData = new Uint8Array(data);
      } else {
        snapshot.dbData = null;
      }
    } catch {
      snapshot.dbData = null;
    }
  }

  // 2. User uploads (filedir) — collect recursively
  snapshot.filedir = collectDirectory(rawPhp, "/persist/moodledata/filedir");

  // 3. Installed plugins (non-core) — scan plugin type dirs
  snapshot.plugins = collectPlugins(rawPhp, webRoot);

  // 4. Active blueprint
  snapshot.blueprint = options.activeBlueprint || null;

  return snapshot;
}

/**
 * Recursively collect all files under a directory.
 * Returns an array of { path (relative to dirPath), data } entries.
 */
function collectDirectory(rawPhp, dirPath) {
  const files = [];
  try {
    if (!rawPhp.fileExists(dirPath) || !rawPhp.isDir(dirPath)) return files;
  } catch {
    return files;
  }
  walkDir(rawPhp, dirPath, dirPath, files);
  return files;
}

/**
 * Walk a directory tree and collect file entries with paths relative to base.
 */
function walkDir(rawPhp, base, current, results) {
  let entries;
  try {
    entries = rawPhp.listFiles(current, { prependPath: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    try {
      if (rawPhp.isDir(entry)) {
        walkDir(rawPhp, base, entry, results);
      } else {
        const relativePath = entry.slice(base.length + 1);
        const data = rawPhp.readFileAsBuffer(entry);
        results.push({ path: relativePath, data: new Uint8Array(data) });
      }
    } catch {
      // Skip unreadable entries
    }
  }
}

const PLUGIN_TYPE_DIRS = [
  "mod",
  "local",
  "blocks",
  "theme",
  "filter",
  "course/format",
  "report",
  "admin/tool",
  "auth",
  "enrol",
];

/**
 * Collect plugin directories that have a version.php marker.
 * Returns files with paths relative to webRoot.
 */
function collectPlugins(rawPhp, webRoot) {
  const files = [];
  for (const typeDir of PLUGIN_TYPE_DIRS) {
    const fullDir = `${webRoot}/${typeDir}`;
    try {
      if (!rawPhp.fileExists(fullDir) || !rawPhp.isDir(fullDir)) continue;
      const entries = rawPhp.listFiles(fullDir, { prependPath: true });
      for (const pluginDir of entries) {
        try {
          if (!rawPhp.isDir(pluginDir)) continue;
          // Check if it has a version.php marker (standard Moodle plugin indicator)
          const versionFile = `${pluginDir}/version.php`;
          if (!rawPhp.fileExists(versionFile)) continue;
          // Collect all files in this plugin directory
          const pluginFiles = [];
          walkDir(rawPhp, webRoot, pluginDir, pluginFiles);
          files.push(...pluginFiles);
        } catch {
          // Not a plugin dir or not accessible, skip
        }
      }
    } catch {
      // Dir not accessible
    }
  }
  return files;
}
