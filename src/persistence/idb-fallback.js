const IDB_NAME = "moodle-persist-fallback";
const IDB_STORE = "files";
const IDB_VERSION = 1;

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, IDB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function tx(db, mode) {
  return db.transaction(IDB_STORE, mode).objectStore(IDB_STORE);
}

function idbRequest(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

const SKIP_PATTERNS = [
  /\/cache\//,
  /\/localcache\//,
  /\/sessions\//,
  /\/temp\//,
  /\/trashdir\//,
  /\/lock\//,
  /\/muc\//,
];

function shouldPersist(virtualPath) {
  return !SKIP_PATTERNS.some((pattern) => pattern.test(virtualPath));
}

export class IdbFallbackStore {
  constructor(scope, moodleBranch) {
    this._prefix = `${scope || "default"}__${moodleBranch || "unknown"}::`;
    this._db = null;
  }

  async init() {
    this._db = await openDb();
    return this;
  }

  _key(virtualPath) {
    return `${this._prefix}${virtualPath}`;
  }

  _stripPrefix(key) {
    return key.startsWith(this._prefix)
      ? key.substring(this._prefix.length)
      : key;
  }

  async saveFile(virtualPath, data) {
    if (!shouldPersist(virtualPath)) return;
    const store = tx(this._db, "readwrite");
    await idbRequest(store.put(data, this._key(virtualPath)));
  }

  async loadFile(virtualPath) {
    try {
      const store = tx(this._db, "readonly");
      const result = await idbRequest(store.get(this._key(virtualPath)));
      return result ? new Uint8Array(result) : null;
    } catch {
      return null;
    }
  }

  async deleteFile(virtualPath) {
    try {
      const store = tx(this._db, "readwrite");
      await idbRequest(store.delete(this._key(virtualPath)));
      return true;
    } catch {
      return false;
    }
  }

  async exists(virtualPath) {
    const data = await this.loadFile(virtualPath);
    return data !== null;
  }

  async listFiles(prefix) {
    const fullPrefix = this._key(prefix);
    const store = tx(this._db, "readonly");
    const allKeys = await idbRequest(store.getAllKeys());
    return allKeys
      .filter((k) => typeof k === "string" && k.startsWith(fullPrefix))
      .map((k) => this._stripPrefix(k));
  }

  async getMetadata() {
    let totalSize = 0;
    let fileCount = 0;
    const store = tx(this._db, "readonly");
    const allKeys = await idbRequest(store.getAllKeys());
    for (const key of allKeys) {
      if (typeof key !== "string" || !key.startsWith(this._prefix)) continue;
      const data = await idbRequest(
        tx(this._db, "readonly").get(key),
      );
      if (data) {
        totalSize += data.byteLength || data.length || 0;
        fileCount += 1;
      }
    }
    return { totalSize, fileCount, lastModified: 0 };
  }

  async clear() {
    const store = tx(this._db, "readwrite");
    const allKeys = await idbRequest(store.getAllKeys());
    for (const key of allKeys) {
      if (typeof key === "string" && key.startsWith(this._prefix)) {
        await idbRequest(tx(this._db, "readwrite").delete(key));
      }
    }
  }

  async saveDirectory(php, dirPath) {
    const rawPhp = php._php || php;
    const files = this._collectMemfsFiles(rawPhp, dirPath);
    for (const { path, data } of files) {
      await this.saveFile(path, data);
    }
    return files.length;
  }

  async loadDirectory(php, dirPath) {
    const rawPhp = php._php || php;
    const stored = await this.listFiles(dirPath);
    let count = 0;
    for (const filePath of stored) {
      const data = await this.loadFile(filePath);
      if (!data) continue;
      const parentDir = filePath.substring(0, filePath.lastIndexOf("/"));
      try {
        rawPhp.mkdirTree(parentDir);
      } catch {
        /* exists */
      }
      rawPhp.writeFile(filePath, data);
      count += 1;
    }
    return count;
  }

  _collectMemfsFiles(rawPhp, dirPath) {
    const files = [];
    try {
      const entries = rawPhp.listFiles(dirPath, { prependPath: true });
      for (const entry of entries) {
        if (rawPhp.isDir(entry)) {
          files.push(...this._collectMemfsFiles(rawPhp, entry));
        } else {
          try {
            const data = rawPhp.readFileAsBuffer(entry);
            if (shouldPersist(entry)) {
              files.push({ path: entry, data: new Uint8Array(data) });
            }
          } catch {
            // Unreadable
          }
        }
      }
    } catch {
      // Directory doesn't exist
    }
    return files;
  }
}
