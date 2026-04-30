const OPFS_ROOT_DIR = "moodle-persist";

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

function splitPath(virtualPath) {
  return virtualPath.split("/").filter(Boolean);
}

export class OpfsStore {
  constructor(scope, moodleBranch) {
    this._scope = scope || "default";
    this._branch = moodleBranch || "unknown";
    this._root = null;
    this._scopeDir = null;
  }

  async init() {
    const root = await navigator.storage.getDirectory();
    this._root = await root.getDirectoryHandle(OPFS_ROOT_DIR, { create: true });
    this._scopeDir = await this._root.getDirectoryHandle(
      `${this._scope}__${this._branch}`,
      { create: true },
    );
    return this;
  }

  async _resolveDirHandle(segments, create = false) {
    let dir = this._scopeDir;
    for (const segment of segments) {
      dir = await dir.getDirectoryHandle(segment, { create });
    }
    return dir;
  }

  async saveFile(virtualPath, data) {
    if (!shouldPersist(virtualPath)) return;
    const segments = splitPath(virtualPath);
    const fileName = segments.pop();
    const dir = await this._resolveDirHandle(segments, true);
    const fileHandle = await dir.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(data);
    await writable.close();
  }

  async loadFile(virtualPath) {
    try {
      const segments = splitPath(virtualPath);
      const fileName = segments.pop();
      const dir = await this._resolveDirHandle(segments, false);
      const fileHandle = await dir.getFileHandle(fileName);
      const file = await fileHandle.getFile();
      return new Uint8Array(await file.arrayBuffer());
    } catch {
      return null;
    }
  }

  async deleteFile(virtualPath) {
    try {
      const segments = splitPath(virtualPath);
      const fileName = segments.pop();
      const dir = await this._resolveDirHandle(segments, false);
      await dir.removeEntry(fileName);
      return true;
    } catch {
      return false;
    }
  }

  async exists(virtualPath) {
    try {
      const segments = splitPath(virtualPath);
      const fileName = segments.pop();
      const dir = await this._resolveDirHandle(segments, false);
      await dir.getFileHandle(fileName);
      return true;
    } catch {
      return false;
    }
  }

  async listFiles(prefix) {
    const results = [];
    const segments = splitPath(prefix);
    let dir;
    try {
      dir = await this._resolveDirHandle(segments, false);
    } catch {
      return results;
    }
    await this._collectEntries(dir, prefix, results);
    return results;
  }

  async _collectEntries(dirHandle, basePath, results) {
    for await (const [name, handle] of dirHandle.entries()) {
      const entryPath = `${basePath}/${name}`.replace(/\/+/g, "/");
      if (handle.kind === "file") {
        results.push(entryPath);
      } else if (handle.kind === "directory") {
        await this._collectEntries(handle, entryPath, results);
      }
    }
  }

  async getMetadata() {
    let totalSize = 0;
    let fileCount = 0;
    let lastModified = 0;

    async function walk(dirHandle) {
      for await (const [, handle] of dirHandle.entries()) {
        if (handle.kind === "file") {
          const file = await handle.getFile();
          totalSize += file.size;
          fileCount += 1;
          if (file.lastModified > lastModified) {
            lastModified = file.lastModified;
          }
        } else if (handle.kind === "directory") {
          await walk(handle);
        }
      }
    }

    if (this._scopeDir) {
      await walk(this._scopeDir);
    }

    return { totalSize, fileCount, lastModified };
  }

  async clear() {
    if (!this._root || !this._scopeDir) return;
    const scopeKey = `${this._scope}__${this._branch}`;
    try {
      await this._root.removeEntry(scopeKey, { recursive: true });
    } catch {
      // Already gone
    }
    this._scopeDir = await this._root.getDirectoryHandle(scopeKey, {
      create: true,
    });
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
