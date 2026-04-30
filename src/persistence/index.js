import { IdbFallbackStore } from "./idb-fallback.js";
import { OpfsStore } from "./opfs-store.js";

function isOpfsAvailable() {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.storage?.getDirectory === "function"
  );
}

export async function createPersistenceStore(scope, moodleBranch) {
  if (isOpfsAvailable()) {
    try {
      const store = new OpfsStore(scope, moodleBranch);
      await store.init();
      return { store, backend: "opfs" };
    } catch {
      // OPFS init failed, fall through to IndexedDB
    }
  }

  try {
    const store = new IdbFallbackStore(scope, moodleBranch);
    await store.init();
    return { store, backend: "indexeddb" };
  } catch {
    return { store: null, backend: "none" };
  }
}

/**
 * Creates a debounced syncFs callback that persists the DB and filedir to
 * the provided store after each PHP request/run.
 *
 * Returns { syncFs, setPhp } — call setPhp(php) once the PHP instance is
 * available. Before that, syncFs calls are silently ignored.
 */
export function createSyncCallback(store, dbFilePath, { postShell } = {}) {
  if (!store) return { syncFs: null, setPhp: () => {} };

  let php = null;
  let debounceTimer = null;
  let dirty = false;
  let syncing = false;

  function log(detail) {
    if (postShell) {
      postShell({ kind: "trace", detail });
    }
  }

  async function doSync() {
    if (syncing || !php) return;
    syncing = true;
    try {
      const rawPhp = php._php || php;
      const dbData = rawPhp.readFileAsBuffer(dbFilePath);
      if (dbData && dbData.byteLength > 0) {
        await store.saveFile(dbFilePath, new Uint8Array(dbData));
      }

      const FILEDIR_PATH = "/persist/moodledata/filedir";
      try {
        if (rawPhp.fileExists(FILEDIR_PATH) && rawPhp.isDir(FILEDIR_PATH)) {
          await store.saveDirectory(php, FILEDIR_PATH);
        }
      } catch {
        // Non-fatal
      }

      dirty = false;
    } catch (err) {
      log(`[persistence] sync error: ${err.message}`);
    } finally {
      syncing = false;
    }
  }

  function syncFs() {
    if (!php) return;
    dirty = true;
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      if (dirty) {
        doSync().catch((err) => {
          log(`[persistence] deferred sync error: ${err.message}`);
        });
      }
    }, 500);
  }

  function setPhp(phpInstance) {
    php = phpInstance;
  }

  return { syncFs, setPhp };
}

export { OpfsStore } from "./opfs-store.js";
export { IdbFallbackStore } from "./idb-fallback.js";
