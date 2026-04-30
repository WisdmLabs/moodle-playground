/**
 * @moodle-playground/client — Embed and control Moodle Playground instances.
 */

const DEFAULT_REMOTE_URL = "https://moodle-playground.com/remote.html";
const READY_TIMEOUT_MS = 120000;

export async function startMoodlePlayground(iframe, options = {}) {
  const {
    remoteUrl = DEFAULT_REMOTE_URL,
    blueprint = null,
    moodleVersion = "5.0",
    phpVersion = "8.3",
    mode = "seamless",
    lazy = false,
  } = options;

  const url = new URL(remoteUrl);
  url.searchParams.set("php", phpVersion);
  url.searchParams.set("moodle", moodleVersion);
  url.searchParams.set("mode", mode);
  if (lazy) url.searchParams.set("lazy", "true");
  if (blueprint) {
    const encoded = btoa(
      unescape(encodeURIComponent(JSON.stringify(blueprint))),
    );
    url.searchParams.set("blueprint", encoded);
  }

  iframe.src = url.toString();

  return createPlaygroundClient(iframe);
}

function createPlaygroundClient(iframe) {
  let readyResolve;
  let readyReject;
  const readyPromise = new Promise((resolve, reject) => {
    readyResolve = resolve;
    readyReject = reject;
  });

  const pendingRequests = new Map();
  let requestId = 0;

  function sendMessage(type, payload = {}) {
    const id = ++requestId;
    return new Promise((resolve, reject) => {
      pendingRequests.set(id, { resolve, reject });
      iframe.contentWindow.postMessage(
        { source: "moodle-playground-client", type, id, ...payload },
        "*",
      );
      setTimeout(() => {
        if (pendingRequests.has(id)) {
          pendingRequests.delete(id);
          reject(new Error(`Request ${type} timed out`));
        }
      }, 30000);
    });
  }

  function handleMessage(event) {
    const data = event.data;
    if (!data || data.source !== "moodle-playground-host") return;

    if (data.type === "ready") {
      readyResolve();
      return;
    }

    if (data.id && pendingRequests.has(data.id)) {
      const { resolve, reject } = pendingRequests.get(data.id);
      pendingRequests.delete(data.id);
      if (data.error) {
        reject(new Error(data.error));
      } else {
        resolve(data.result);
      }
    }
  }

  window.addEventListener("message", handleMessage);

  const readyTimeout = setTimeout(() => {
    readyReject(new Error("Playground did not become ready within timeout"));
  }, READY_TIMEOUT_MS);

  readyPromise
    .then(() => clearTimeout(readyTimeout))
    .catch(() => clearTimeout(readyTimeout));

  return {
    isReady() {
      return readyPromise;
    },

    async navigate(path) {
      return sendMessage("navigate", { path });
    },

    async runPhp(code) {
      return sendMessage("run-php", { code });
    },

    async listFiles(dir) {
      return sendMessage("list-files", { dir });
    },

    async readFile(path) {
      return sendMessage("read-file", { path });
    },

    async writeFile(path, data) {
      const encoded = typeof data === "string" ? data : Array.from(data);
      return sendMessage("write-file", { path, data: encoded });
    },

    async exportSite() {
      return sendMessage("export-site");
    },

    async importSite(zipArrayBuffer) {
      return sendMessage("import-site", {
        data: Array.from(new Uint8Array(zipArrayBuffer)),
      });
    },

    destroy() {
      window.removeEventListener("message", handleMessage);
      clearTimeout(readyTimeout);
      pendingRequests.clear();
      iframe.src = "about:blank";
    },
  };
}
