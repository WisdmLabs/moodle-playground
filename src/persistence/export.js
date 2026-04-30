/**
 * ZIP export for site state snapshots.
 *
 * Takes a snapshot object produced by collectSnapshot() and packs it
 * into a ZIP file using fflate.
 *
 * @module persistence/export
 */

import { zipSync } from "fflate";

/**
 * Create a ZIP file from a playground snapshot.
 *
 * @param {object} snapshot - Snapshot from collectSnapshot()
 * @returns {Uint8Array} ZIP file data
 */
export function createPlaygroundZip(snapshot) {
  const files = {};

  // DB file at root
  if (snapshot.dbData) {
    files["database/moodle.sq3"] = snapshot.dbData;
  }

  // filedir preserving directory structure
  for (const file of snapshot.filedir || []) {
    files[`filedir/${file.path}`] = file.data;
  }

  // Plugins
  for (const file of snapshot.plugins || []) {
    files[`plugins/${file.path}`] = file.data;
  }

  // Metadata
  files["playground.json"] = new TextEncoder().encode(
    JSON.stringify(
      {
        version: snapshot.version,
        timestamp: snapshot.timestamp,
        moodleVersion: snapshot.moodleVersion,
        phpVersion: snapshot.phpVersion,
        blueprint: snapshot.blueprint,
      },
      null,
      2,
    ),
  );

  return zipSync(files);
}
