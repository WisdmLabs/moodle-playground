/**
 * ZIP import for site state restoration.
 *
 * Unpacks a previously exported ZIP and writes the database, filedir,
 * and plugin files back into the PHP MEMFS filesystem.
 *
 * @module persistence/import
 */

import { unzipSync } from "fflate";

/**
 * Import a playground ZIP file into the running PHP runtime.
 *
 * @param {ArrayBuffer|Uint8Array} zipBuffer - Raw ZIP file data
 * @param {object} php - The php-compat wrapper (has ._php for raw FS access)
 * @param {object} [options]
 * @param {string} [options.dbFilePath] - Full path to write the SQLite DB file
 * @param {string} [options.webRoot] - Moodle webroot (default "/www/moodle")
 * @returns {object} Parsed metadata from playground.json
 */
export function importPlaygroundZip(zipBuffer, php, options = {}) {
  const rawPhp = php._php || php;
  const files = unzipSync(new Uint8Array(zipBuffer));

  // 1. Read metadata
  let metadata = {};
  if (files["playground.json"]) {
    metadata = JSON.parse(new TextDecoder().decode(files["playground.json"]));
  }

  // 2. Write DB file to MEMFS
  const dbData = files["database/moodle.sq3"];
  if (dbData && options.dbFilePath) {
    ensureParentDir(rawPhp, options.dbFilePath);
    rawPhp.writeFile(options.dbFilePath, dbData);
  }

  // 3. Restore filedir
  for (const [path, data] of Object.entries(files)) {
    if (path.startsWith("filedir/") && data.length > 0) {
      const target = `/persist/moodledata/${path}`;
      ensureParentDir(rawPhp, target);
      rawPhp.writeFile(target, data);
    }
  }

  // 4. Restore plugins
  const webRoot = options.webRoot || "/www/moodle";
  for (const [path, data] of Object.entries(files)) {
    if (path.startsWith("plugins/") && data.length > 0) {
      const target = `${webRoot}/${path.slice("plugins/".length)}`;
      ensureParentDir(rawPhp, target);
      rawPhp.writeFile(target, data);
    }
  }

  return metadata;
}

/**
 * Ensure all parent directories of a file path exist.
 * Uses mkdirTree when available (Emscripten), falls back to manual creation.
 */
function ensureParentDir(rawPhp, filePath) {
  const parts = filePath.split("/").filter(Boolean);
  parts.pop(); // remove filename
  const parentDir = `/${parts.join("/")}`;

  if (rawPhp.mkdirTree) {
    try {
      rawPhp.mkdirTree(parentDir);
      return;
    } catch {
      // Fall through to manual approach
    }
  }

  let current = "";
  for (const part of parts) {
    current += `/${part}`;
    try {
      if (!rawPhp.isDir(current)) {
        rawPhp.mkdir(current);
      }
    } catch {
      try {
        rawPhp.mkdir(current);
      } catch {
        /* already exists */
      }
    }
  }
}
