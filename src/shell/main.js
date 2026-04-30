import {
  clearBlueprint,
  parseBlueprint,
  resolveBlueprint,
  validateBlueprint,
} from "../blueprint/index.js";
import { loadPlaygroundConfig } from "../shared/config.js";
import { resolveRemoteUrl } from "../shared/paths.js";
import { createShellChannel, SNAPSHOT_VERSION } from "../shared/protocol.js";
import { registerVersionedServiceWorker } from "../shared/service-worker-version.js";
import {
  clearScopeSession,
  getOrCreateScopeId,
  loadSessionState,
  saveSessionState,
} from "../shared/storage.js";
import {
  DEFAULT_PHP_VERSION,
  getCompatiblePhpVersions,
  MOODLE_BRANCHES,
  parseQueryParams,
  resolveRuntimeSelection,
  shouldTraceRuntimeSelection,
} from "../shared/version-resolver.js";

const els = {
  addressForm: document.querySelector("#address-form"),
  address: document.querySelector("#address-input"),
  blueprintPanel: document.querySelector("#blueprint-panel"),
  blueprintTab: document.querySelector("#blueprint-tab"),
  blueprintTextarea: document.querySelector("#blueprint-textarea"),
  clearLogs: document.querySelector("#clear-logs-button"),
  copyLogs: document.querySelector("#copy-logs-button"),
  exportButton: document.querySelector("#export-button"),
  importInput: document.querySelector("#import-input"),
  frame: document.querySelector("#site-frame"),
  logPanel: document.querySelector("#log-panel"),
  logsPanel: document.querySelector("#logs-panel"),
  logsTab: document.querySelector("#logs-tab"),
  panelToggle: document.querySelector("#panel-toggle-button"),
  phpInfoFrame: document.querySelector("#phpinfo-frame"),
  phpInfoPanel: document.querySelector("#phpinfo-panel"),
  phpInfoTab: document.querySelector("#phpinfo-tab"),
  refreshPhpInfoButton: document.querySelector("#refresh-phpinfo-button"),
  home: document.querySelector("#home-button"),
  refresh: document.querySelector("#refresh-button"),
  reset: document.querySelector("#reset-button"),
  settingsButton: document.querySelector("#settings-button"),
  settingsPopover: document.querySelector("#settings-popover"),
  settingsOverlay: document.querySelector("#settings-overlay"),
  settingsMoodleVersion: document.querySelector("#settings-moodle-version"),
  settingsPhpVersion: document.querySelector("#settings-php-version"),
  settingsApply: document.querySelector("#settings-apply"),
  settingsCancel: document.querySelector("#settings-cancel"),
  currentMoodleLabel: document.querySelector("#current-moodle-label"),
  currentPhpLabel: document.querySelector("#current-php-label"),
  currentRuntimeLabel: document.querySelector("#current-runtime-label"),
  cronToggle: document.querySelector("#cron-toggle"),
  cronStatus: document.querySelector("#cron-status"),
  cronLastRun: document.querySelector("#cron-last-run"),
  cronRunNow: document.querySelector("#cron-run-now"),
  cronInterval: document.querySelector("#cron-interval"),
  cronRunCount: document.querySelector("#cron-run-count"),
  galleryPanel: document.querySelector("#gallery-panel"),
  galleryTab: document.querySelector("#gallery-tab"),
  gallerySearchInput: document.querySelector("#gallery-search-input"),
  galleryContent: document.querySelector("#gallery-content"),
  infoPanel: document.querySelector("#info-panel"),
  infoTab: document.querySelector("#info-tab"),
  sidePanel: document.querySelector("#side-panel"),
  workspace: document.querySelector("#workspace"),
  saveStateButton: document.querySelector("#save-state-button"),
  resetStorageButton: document.querySelector("#reset-storage-button"),
  persistenceStatusRow: document.querySelector("#persistence-status-row"),
  persistenceStatus: document.querySelector("#persistence-status"),
  exportSiteButton: document.querySelector("#export-site-button"),
  importSiteInput: document.querySelector("#import-site-input"),
  shareButton: document.querySelector("#share-button"),
  sharePopover: document.querySelector("#share-popover"),
  shareOverlay: document.querySelector("#share-overlay"),
  shareUrlInput: document.querySelector("#share-url-input"),
  shareCopyButton: document.querySelector("#share-copy-button"),
  shareCloseButton: document.querySelector("#share-close-button"),
  githubTokenInput: document.querySelector("#github-token-input"),
  githubGistButton: document.querySelector("#github-gist-button"),
  githubGistResult: document.querySelector("#github-gist-result"),
};

const scopeId = getOrCreateScopeId();
let config;
let currentRuntimeId;
let currentPhpVersion = DEFAULT_PHP_VERSION;
let currentMoodleBranch = null;
let currentAddonProxyUrl = null;
let currentPhpCorsProxyUrl = null;
let currentDebugParam = null;
let currentProfileParam = null;
let currentMcpWs = null;
let currentPath = "/";
let channel;
let serviceWorkerReady = null;
let activeBlueprint;
let remoteFrameBooted = false;
let uiLocked = true;
const remoteReloadToken = 0;
let pendingCleanBoot = false;
let latestPhpInfoHtml = "";
// biome-ignore lint/correctness/noUnusedVariables: reserved for future phpinfo capture tracking
let phpInfoCapturePromise = null;
const CONTROL_RELOAD_KEY = `moodle-playground:${scopeId}:sw-controlled`;

function applyRuntimeSelection(selection) {
  currentPhpVersion = selection.phpVersion;
  currentMoodleBranch = selection.moodleBranch;
  currentRuntimeId = selection.runtimeId;
}

function traceRuntimeSelection(stage, detail) {
  if (
    !shouldTraceRuntimeSelection({
      debug: currentDebugParam,
      profile: currentProfileParam,
    })
  ) {
    return;
  }

  appendLog(`[runtime-selection][shell:${stage}] ${detail}`);
}

function isInternalRuntimePath(path) {
  return typeof path === "string" && /^\/__[^/]+\.php(?:[?#].*)?$/u.test(path);
}

const MAX_LOG_ENTRIES = 500;

function appendLog(message, isError = false) {
  const line = `[${new Date().toISOString()}] ${message}`;
  const span = document.createElement("span");
  span.textContent = `${line}\n`;
  if (isError) {
    span.className = "error";
  }
  els.logPanel.append(span);
  // Prune oldest entries to prevent unbounded DOM growth
  while (els.logPanel.childElementCount > MAX_LOG_ENTRIES) {
    els.logPanel.firstElementChild?.remove();
  }
  els.logPanel.scrollTop = els.logPanel.scrollHeight;
}

function setUiLocked(locked) {
  uiLocked = locked;
  els.address.disabled = locked;
  els.refreshPhpInfoButton.disabled = locked;
  els.reset.disabled = locked;
  els.exportButton.disabled = locked;
  els.importInput.disabled = locked;
  if (els.exportSiteButton) els.exportSiteButton.disabled = locked;
  els.addressForm.classList.toggle("is-disabled", locked);
}

async function ensureRuntimeServiceWorker() {
  if (!config) {
    return;
  }

  await registerVersionedServiceWorker(
    new URL("../../sw.bundle.js", import.meta.url),
    {
      scope: "./",
    },
  );
  await navigator.serviceWorker.ready;

  if (!navigator.serviceWorker.controller) {
    const alreadyReloaded =
      window.sessionStorage.getItem(CONTROL_RELOAD_KEY) === "1";
    if (!alreadyReloaded) {
      window.sessionStorage.setItem(CONTROL_RELOAD_KEY, "1");
      window.location.reload();
      return new Promise(() => {});
    }
  }

  window.sessionStorage.removeItem(CONTROL_RELOAD_KEY);
}

async function updateFrame() {
  if (!serviceWorkerReady) {
    serviceWorkerReady = ensureRuntimeServiceWorker();
  }

  await serviceWorkerReady;
  const url = resolveRemoteUrl(scopeId, currentRuntimeId, currentPath, {
    phpVersion: currentPhpVersion,
    moodleBranch: currentMoodleBranch,
    addonProxyUrl: currentAddonProxyUrl,
    phpCorsProxyUrl: currentPhpCorsProxyUrl,
    debug: currentDebugParam,
    profile: currentProfileParam,
    mcpWs: currentMcpWs,
  });
  if (pendingCleanBoot) {
    url.searchParams.set("clean", "1");
  }
  if (remoteReloadToken > 0) {
    url.searchParams.set("reload", String(remoteReloadToken));
  }
  remoteFrameBooted = false;
  els.frame.src = url.toString();
  pendingCleanBoot = false;
}

function postToRemote(message) {
  if (!els.frame.contentWindow) {
    return false;
  }

  els.frame.contentWindow.postMessage(message, window.location.origin);
  return true;
}

function navigateWithinRuntime(path) {
  if (uiLocked) {
    return;
  }

  currentPath = path || "/";
  els.address.value = currentPath;
  saveState();

  if (
    remoteFrameBooted &&
    postToRemote({ kind: "navigate-site", path: currentPath })
  ) {
    appendLog(`Navigating site to ${currentPath}`);
    return;
  }

  void updateFrame();
}

// biome-ignore lint/correctness/noUnusedVariables: called via postToRemote from remote.html
function refreshWithinRuntime() {
  if (remoteFrameBooted && postToRemote({ kind: "refresh-site" })) {
    appendLog(`Refreshing ${currentPath}`);
    return;
  }

  void updateFrame();
}

function setPhpInfoContent(html = "") {
  latestPhpInfoHtml = typeof html === "string" ? html : "";
  if (!els.phpInfoFrame) {
    return;
  }

  if (!latestPhpInfoHtml) {
    els.phpInfoFrame.srcdoc = `<!doctype html><meta charset="utf-8"><style>
      html,body{height:100%}
      body{margin:0;font:14px/1.5 ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;padding:16px;color:#1f2937;background:#fff;box-sizing:border-box}
      p{margin:0}
    </style><p>No PHP diagnostics captured yet.</p>`;
    return;
  }

  const responsivePhpInfoHtml = latestPhpInfoHtml.replace(
    "</head>",
    `<style>
      html,body{height:100%}
      body{margin:0;padding:12px;box-sizing:border-box;overflow:auto;background:#fff;color:#222;font-family:sans-serif}
      .center{width:100%}
      .center table{width:100%;max-width:100%;margin:1em auto;text-align:left}
      table{border-collapse:collapse;border:0;width:100%;max-width:100%;box-shadow:0 1px 3px rgba(0,0,0,.12);table-layout:auto}
      td,th{border:1px solid #666;font-size:75%;vertical-align:baseline;padding:4px 5px}
      th{position:sticky;top:0;background:inherit}
      .e{width:28%;min-width:180px}
      .v{max-width:none;overflow-wrap:anywhere;word-break:break-word}
      hr{width:100%;max-width:100%}
      img{max-width:100%;height:auto}
      pre{white-space:pre-wrap;overflow-wrap:anywhere}
      h1,h2{scroll-margin-top:12px}
    </style></head>`,
  );

  els.phpInfoFrame.srcdoc = responsivePhpInfoHtml;
}

function requestPhpInfoCapture() {
  setActivePanel("phpinfo");
  capturePhpInfoViaWorker("manual");
}

function capturePhpInfoViaWorker(reason = "manual") {
  if (!config) {
    appendLog(
      "Cannot capture PHP info before the playground configuration is loaded.",
      true,
    );
    return;
  }

  appendLog(`Requesting PHP runtime diagnostics (${reason}).`);

  // Send capture request through the site iframe (remote.html), which forwards it to the worker.
  // The worker will respond via BroadcastChannel with a "phpinfo" message.
  if (els.frame?.contentWindow) {
    els.frame.contentWindow.postMessage({ kind: "capture-phpinfo" }, "*");
  } else {
    appendLog("Cannot capture PHP info: remote frame not available.", true);
  }
}

function postCronMessage(message) {
  if (els.frame?.contentWindow) {
    els.frame.contentWindow.postMessage(message, "*");
  }
}

function updateCronUi(status) {
  if (els.cronToggle) {
    els.cronToggle.checked = status.enabled;
  }
  if (els.cronStatus) {
    if (!status.enabled) {
      els.cronStatus.textContent = "Disabled";
      els.cronStatus.className = "settings-value cron-status--disabled";
    } else if (status.running) {
      els.cronStatus.textContent = "Running...";
      els.cronStatus.className = "settings-value cron-status--running";
    } else {
      els.cronStatus.textContent = "Idle";
      els.cronStatus.className = "settings-value cron-status--idle";
    }
  }
  if (els.cronLastRun) {
    els.cronLastRun.textContent = status.lastRun
      ? new Date(status.lastRun).toLocaleTimeString()
      : "Never";
  }
  if (els.cronRunCount) {
    els.cronRunCount.textContent = String(status.runCount || 0);
  }
  if (els.cronRunNow) {
    els.cronRunNow.disabled = uiLocked || status.running;
  }
}

function setActivePanel(panel) {
  const panels = {
    phpinfo: [els.phpInfoPanel, els.phpInfoTab],
    blueprint: [els.blueprintPanel, els.blueprintTab],
    gallery: [els.galleryPanel, els.galleryTab],
    logs: [els.logsPanel, els.logsTab],
    info: [els.infoPanel, els.infoTab],
  };

  for (const [panelName, [panelEl, tabEl]] of Object.entries(panels)) {
    const isActive = panelName === panel;
    panelEl.classList.toggle("is-hidden", !isActive);
    tabEl.classList.toggle("is-active", isActive);
    tabEl.setAttribute("aria-selected", String(isActive));
  }
}

function toggleSidePanel() {
  const collapsed = els.sidePanel.classList.toggle("is-collapsed");
  els.workspace.classList.toggle("is-panel-collapsed", collapsed);
  els.panelToggle.setAttribute("aria-expanded", String(!collapsed));
}

function saveState(extra = {}) {
  saveSessionState(scopeId, {
    scopeId,
    runtimeId: currentRuntimeId,
    path: currentPath,
    ...extra,
  });
}

function exportBlueprint() {
  const payload = activeBlueprint || {};
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "moodle-playground.blueprint.json";
  link.click();
  URL.revokeObjectURL(url);
}

function updateBlueprintTextarea() {
  if (!activeBlueprint || !els.blueprintTextarea) {
    return;
  }

  els.blueprintTextarea.value = JSON.stringify(activeBlueprint, null, 2);
  els.blueprintTextarea.scrollTop = 0;
}

async function importPayload(file) {
  const rawPayload = JSON.parse(await file.text());

  // Check if this is a snapshot payload (old format)
  if (rawPayload?.version === SNAPSHOT_VERSION) {
    applyRuntimeSelection(
      resolveRuntimeSelection({ runtimeId: rawPayload.runtimeId }),
    );
    currentPath = rawPayload.path || "/";
    els.address.value = currentPath;
    saveState({ importedAt: new Date().toISOString() });
    await updateFrame();
    return;
  }

  // Parse and validate as blueprint
  const blueprint = parseBlueprint(rawPayload);
  const validation = validateBlueprint(blueprint);
  if (!validation.valid) {
    appendLog(
      `Blueprint validation errors:\n${validation.errors.join("\n")}`,
      true,
    );
  }

  // Encode the blueprint into the URL and trigger a full page reload,
  // the same way version changes work. This ensures a clean WASM runtime
  // with no stale state from the previous session.
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(blueprint))));
  const url = new URL(window.location.href);
  url.searchParams.set("blueprint", encoded);
  url.searchParams.delete("blueprint-url");
  window.location.href = url.toString();
}

function bindShellChannel() {
  channel = new BroadcastChannel(createShellChannel(scopeId));
  channel.addEventListener("message", (event) => {
    const message = event.data;

    switch (message.kind) {
      case "progress":
        setUiLocked(true);
        appendLog(`${message.title}: ${message.detail}`);
        break;
      case "ready":
        setUiLocked(false);
        {
          const previousPath = currentPath;
          currentPath = isInternalRuntimePath(message.path)
            ? currentPath
            : message.path || currentPath;
          if (remoteFrameBooted && currentPath !== previousPath) {
            postToRemote({ kind: "navigate-site", path: currentPath });
          }
        }
        els.address.value = currentPath;
        saveState({ lastReadyAt: new Date().toISOString() });
        // Request persistence storage info once runtime is ready
        postToRemote({ kind: "persistence-info" });
        break;
      case "frame-ready":
        remoteFrameBooted = true;
        if (!uiLocked) {
          currentPath = isInternalRuntimePath(message.path)
            ? currentPath
            : message.path || currentPath;
          els.address.value = currentPath;
          saveState();
        }
        break;
      case "navigate":
        currentPath = isInternalRuntimePath(message.path)
          ? currentPath
          : message.path || "/";
        els.address.value = currentPath;
        saveState();
        break;
      case "error":
        remoteFrameBooted = false;
        setUiLocked(false);
        appendLog(message.detail, true);
        if (!latestPhpInfoHtml) {
          setActivePanel("phpinfo");
          capturePhpInfoViaWorker("bootstrap-error");
        }
        break;
      case "wasm-network-error":
        appendLog(
          `${message.detail} — This is a known limitation on Firefox and Safari. The page may not render fully.`,
          true,
        );
        break;
      case "phpinfo":
        setPhpInfoContent(message.html || "");
        appendLog(message.detail || "Captured PHP runtime diagnostics.");
        break;
      case "cron-status":
        updateCronUi(message);
        break;
      case "trace":
        appendLog(message.detail || "[trace]");
        break;
      case "persistence-saved":
        appendLog(message.detail || "State saved.");
        break;
      case "persistence-reset":
        appendLog(message.detail || "Persistent storage cleared.");
        break;
      case "persistence-info":
        updatePersistenceStatus(message);
        break;
      case "site-export-complete": {
        const blob = new Blob([new Uint8Array(message.data)], {
          type: "application/zip",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `moodle-playground-${Date.now()}.zip`;
        link.click();
        URL.revokeObjectURL(url);
        appendLog("Site exported successfully.");
        break;
      }
      case "site-import-complete":
        appendLog("Site imported. Reloading...");
        window.location.reload();
        break;
      default:
        break;
    }
  });
}

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** i).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

function updatePersistenceStatus(info) {
  if (!els.persistenceStatusRow || !els.persistenceStatus) return;
  if (info.backend === "none") {
    els.persistenceStatusRow.style.display = "none";
    if (els.saveStateButton) els.saveStateButton.style.display = "none";
    if (els.resetStorageButton) els.resetStorageButton.style.display = "none";
    return;
  }
  els.persistenceStatusRow.style.display = "";
  if (els.saveStateButton) els.saveStateButton.style.display = "";
  if (els.resetStorageButton) els.resetStorageButton.style.display = "";
  const label = info.backend === "opfs" ? "OPFS" : "IndexedDB";
  if (info.fileCount > 0) {
    els.persistenceStatus.textContent = `${label} -- ${formatBytes(info.totalSize)}, ${info.fileCount} files`;
  } else {
    els.persistenceStatus.textContent = `${label} -- empty`;
  }
}

function bindServiceWorkerMessages() {
  navigator.serviceWorker.addEventListener("message", (event) => {
    const message = event.data;
    if (message?.kind === "sw-debug") {
      appendLog(`[sw] ${message.detail}`);
    }
  });
}

function populateSettingsModal() {
  if (!els.settingsMoodleVersion || !els.settingsPhpVersion) {
    return;
  }

  // Populate Moodle version dropdown
  els.settingsMoodleVersion.innerHTML = "";
  for (const branch of MOODLE_BRANCHES) {
    const option = document.createElement("option");
    option.value = branch.branch;
    option.textContent = branch.label;
    els.settingsMoodleVersion.append(option);
  }
  els.settingsMoodleVersion.value = currentMoodleBranch;

  // Populate PHP version dropdown based on selected Moodle branch
  updatePhpVersionDropdown(currentMoodleBranch);
  els.settingsPhpVersion.value = currentPhpVersion;
}

function updatePhpVersionDropdown(branch) {
  if (!els.settingsPhpVersion) {
    return;
  }

  const compatibleVersions = getCompatiblePhpVersions(branch);
  const previousValue = els.settingsPhpVersion.value;
  els.settingsPhpVersion.innerHTML = "";
  for (const version of compatibleVersions) {
    const option = document.createElement("option");
    option.value = version;
    option.textContent = `PHP ${version}`;
    els.settingsPhpVersion.append(option);
  }

  // Keep current selection if still compatible, otherwise fall back
  if (compatibleVersions.includes(previousValue)) {
    els.settingsPhpVersion.value = previousValue;
  } else if (compatibleVersions.includes(DEFAULT_PHP_VERSION)) {
    els.settingsPhpVersion.value = DEFAULT_PHP_VERSION;
  } else {
    els.settingsPhpVersion.value = compatibleVersions[0];
  }
}

function updateCurrentVersionLabels() {
  const branchInfo = MOODLE_BRANCHES.find(
    (b) => b.branch === currentMoodleBranch,
  );
  if (els.currentMoodleLabel) {
    els.currentMoodleLabel.textContent = branchInfo
      ? branchInfo.label
      : currentMoodleBranch;
  }
  if (els.currentPhpLabel) {
    els.currentPhpLabel.textContent = `PHP ${currentPhpVersion}`;
  }
  if (els.currentRuntimeLabel) {
    els.currentRuntimeLabel.textContent = currentRuntimeId;
  }
}

function openSettingsPopover() {
  if (!els.settingsPopover) {
    return;
  }
  populateSettingsModal();
  els.settingsPopover.classList.add("is-open");
  els.settingsOverlay.classList.add("is-open");
  els.settingsOverlay.setAttribute("aria-hidden", "false");
  els.settingsButton.setAttribute("aria-expanded", "true");
  // Focus the first select for keyboard users
  const firstInput = els.settingsPopover.querySelector("select");
  if (firstInput) {
    firstInput.focus();
  }
}

function closeSettingsPopover() {
  if (!els.settingsPopover) {
    return;
  }
  els.settingsPopover.classList.remove("is-open");
  els.settingsOverlay.classList.remove("is-open");
  els.settingsOverlay.setAttribute("aria-hidden", "true");
  els.settingsButton.setAttribute("aria-expanded", "false");
  els.settingsButton.focus();
}

function applySettingsAndReset() {
  const newBranch = els.settingsMoodleVersion?.value;
  const newPhp = els.settingsPhpVersion?.value;
  closeSettingsPopover();

  if (newBranch === currentMoodleBranch && newPhp === currentPhpVersion) {
    return;
  }

  // Update URL params and reload
  const url = new URL(window.location.href);
  url.searchParams.set("php", newPhp);
  const branchInfo = MOODLE_BRANCHES.find((b) => b.branch === newBranch);
  url.searchParams.set("moodle", branchInfo ? branchInfo.version : newBranch);
  url.searchParams.delete("moodleBranch");
  window.location.href = url.toString();
}

let galleryLoaded = false;

function showGalleryEmpty() {
  if (!els.galleryContent) {
    return;
  }
  els.galleryContent.textContent = "";
  const p = document.createElement("p");
  p.className = "gallery-empty";
  p.textContent = "No blueprints found.";
  els.galleryContent.append(p);
}

async function loadGallery() {
  if (galleryLoaded) {
    return;
  }
  galleryLoaded = true;

  if (!els.galleryContent) {
    return;
  }

  try {
    const response = await fetch("./assets/blueprints/gallery.json");
    if (!response.ok) {
      showGalleryEmpty();
      return;
    }
    const data = await response.json();
    renderGallery(data);
  } catch {
    showGalleryEmpty();
  }
}

function renderGallery(data) {
  if (!els.galleryContent) {
    return;
  }

  const categories = data.categories || [];
  if (categories.length === 0) {
    showGalleryEmpty();
    return;
  }

  els.galleryContent.textContent = "";
  for (const category of categories) {
    const section = document.createElement("div");
    section.className = "gallery-category";

    const title = document.createElement("div");
    title.className = "gallery-category__title";
    title.textContent = category.name || "Untitled";
    section.append(title);

    const items = category.blueprints || [];
    for (const item of items) {
      const card = document.createElement("div");
      card.className = "gallery-card";
      card.dataset.title = (item.title || "").toLowerCase();
      card.dataset.desc = (item.description || "").toLowerCase();

      const cardTitle = document.createElement("div");
      cardTitle.className = "gallery-card__title";
      cardTitle.textContent = item.title || "Untitled";
      card.append(cardTitle);

      if (item.description) {
        const cardDesc = document.createElement("div");
        cardDesc.className = "gallery-card__desc";
        cardDesc.textContent = item.description;
        card.append(cardDesc);
      }

      const actions = document.createElement("div");
      actions.className = "gallery-card__actions";

      const launchBtn = document.createElement("button");
      launchBtn.type = "button";
      launchBtn.className = "gallery-card__launch";
      launchBtn.textContent = "Launch";
      launchBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        const blueprintUrl =
          item.file || `./assets/blueprints/examples/${item.filename}`;
        window.location.search = `?blueprint-url=${encodeURIComponent(blueprintUrl)}`;
      });
      actions.append(launchBtn);
      card.append(actions);

      section.append(card);
    }

    els.galleryContent.append(section);
  }
}

function filterGalleryCards(query) {
  if (!els.galleryContent) {
    return;
  }

  const normalizedQuery = (query || "").toLowerCase().trim();
  const categories = els.galleryContent.querySelectorAll(".gallery-category");

  for (const category of categories) {
    const cards = category.querySelectorAll(".gallery-card");
    let visibleCount = 0;

    for (const card of cards) {
      const titleText = card.dataset.title || "";
      const descText = card.dataset.desc || "";
      const matches =
        !normalizedQuery ||
        titleText.includes(normalizedQuery) ||
        descText.includes(normalizedQuery);

      card.style.display = matches ? "" : "none";
      if (matches) {
        visibleCount++;
      }
    }

    // Hide category heading if no cards match
    category.style.display = visibleCount > 0 ? "" : "none";
  }
}

function showLazySplash() {
  const viewport = document.querySelector(".viewport");
  if (!viewport) return;

  const splash = document.createElement("div");
  splash.className = "lazy-splash";

  const title = document.createElement("h2");
  title.textContent = "Moodle Playground";
  splash.append(title);

  const subtitle = document.createElement("p");
  subtitle.textContent = "Click to start the Moodle runtime";
  splash.append(subtitle);

  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = "Launch Moodle";
  btn.addEventListener("click", () => {
    splash.remove();
    void updateFrame();
  });
  splash.append(btn);

  viewport.append(splash);
}

function openSharePopover() {
  if (!els.sharePopover) return;
  updateShareUrl();
  els.sharePopover.classList.add("is-open");
  els.shareOverlay.classList.add("is-open");
  els.shareOverlay.setAttribute("aria-hidden", "false");
}

function closeSharePopover() {
  if (!els.sharePopover) return;
  els.sharePopover.classList.remove("is-open");
  els.shareOverlay.classList.remove("is-open");
  els.shareOverlay.setAttribute("aria-hidden", "true");
}

function updateShareUrl() {
  if (!els.shareUrlInput) return;
  const shareType = document.querySelector('input[name="share-type"]:checked')?.value || "blueprint";
  const baseUrl = new URL(window.location.href);
  baseUrl.search = "";
  baseUrl.hash = "";

  if (shareType === "blueprint" && activeBlueprint) {
    const json = JSON.stringify(activeBlueprint);
    const encoded = btoa(unescape(encodeURIComponent(json)));
    baseUrl.hash = encoded;
    els.shareUrlInput.value = baseUrl.toString();
  } else {
    // Query params mode
    if (currentMoodleBranch) {
      const meta = MOODLE_BRANCHES.find(b => b.branch === currentMoodleBranch);
      if (meta) baseUrl.searchParams.set("moodle", meta.version);
    }
    if (currentPhpVersion) baseUrl.searchParams.set("php", currentPhpVersion);
    els.shareUrlInput.value = baseUrl.toString();
  }
}

async function main() {
  config = await loadPlaygroundConfig();

  // Display mode: seamless hides all chrome for embedding
  const displayMode = new URLSearchParams(window.location.search).get("mode") || "browser-full-screen";
  if (displayMode === "seamless") {
    document.body.classList.add("is-seamless");
  }

  activeBlueprint = await resolveBlueprint({
    scopeId,
    location: window.location,
    defaultBlueprintUrl: config.defaultBlueprintUrl,
  });
  updateBlueprintTextarea();

  // Resolve versions from URL params > blueprint > defaults
  const urlParams = parseQueryParams(window.location);
  const blueprintVersions = {
    php: activeBlueprint?.preferredVersions?.php || null,
    moodle: activeBlueprint?.preferredVersions?.moodle || null,
  };
  const selection = resolveRuntimeSelection({
    php: urlParams.php || blueprintVersions.php,
    phpVersion: urlParams.phpVersion,
    moodle: urlParams.moodle || blueprintVersions.moodle,
    moodleBranch: urlParams.moodleBranch,
  });
  currentDebugParam = urlParams.debug;
  currentProfileParam = urlParams.profile;
  currentAddonProxyUrl = urlParams.addonProxyUrl;
  currentPhpCorsProxyUrl = urlParams.phpCorsProxyUrl;
  currentMcpWs = urlParams.mcpWs;
  applyRuntimeSelection(selection);
  traceRuntimeSelection(
    "resolved",
    `params=${JSON.stringify(urlParams)} -> php=${currentPhpVersion}, moodleBranch=${currentMoodleBranch}, runtimeId=${currentRuntimeId}`,
  );

  const previous = loadSessionState(scopeId);
  const preferredPath =
    activeBlueprint?.landingPage || config.landingPath || "/";
  const shouldBypassSavedLogin =
    config.autologin && previous?.path === "/login";
  const shouldBypassInternalPath = isInternalRuntimePath(previous?.path);

  currentPath =
    shouldBypassSavedLogin || shouldBypassInternalPath
      ? preferredPath
      : previous?.path || preferredPath;
  els.address.value = currentPath;

  updateCurrentVersionLabels();

  // Settings popover event listeners
  if (els.settingsButton) {
    els.settingsButton.addEventListener("click", () => {
      const isOpen = els.settingsPopover?.classList.contains("is-open");
      if (isOpen) {
        closeSettingsPopover();
      } else {
        openSettingsPopover();
      }
    });
  }
  if (els.settingsOverlay) {
    els.settingsOverlay.addEventListener("click", closeSettingsPopover);
  }
  if (els.settingsCancel) {
    els.settingsCancel.addEventListener("click", closeSettingsPopover);
  }
  if (els.settingsApply) {
    els.settingsApply.addEventListener("click", applySettingsAndReset);
  }
  if (els.settingsMoodleVersion) {
    els.settingsMoodleVersion.addEventListener("change", () => {
      updatePhpVersionDropdown(els.settingsMoodleVersion.value);
    });
  }

  // Close popovers on Escape
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (els.sharePopover?.classList.contains("is-open")) {
        closeSharePopover();
      }
      if (els.settingsPopover?.classList.contains("is-open")) {
        closeSettingsPopover();
      }
    }
  });

  // Share popover event listeners
  if (els.shareButton) {
    els.shareButton.addEventListener("click", () => {
      const isOpen = els.sharePopover?.classList.contains("is-open");
      if (isOpen) closeSharePopover();
      else openSharePopover();
    });
  }
  if (els.shareOverlay) {
    els.shareOverlay.addEventListener("click", closeSharePopover);
  }
  if (els.shareCloseButton) {
    els.shareCloseButton.addEventListener("click", closeSharePopover);
  }
  if (els.shareCopyButton) {
    els.shareCopyButton.addEventListener("click", () => {
      if (els.shareUrlInput?.value) {
        navigator.clipboard.writeText(els.shareUrlInput.value).then(() => {
          const orig = els.shareCopyButton.textContent;
          els.shareCopyButton.textContent = "Copied!";
          setTimeout(() => { els.shareCopyButton.textContent = orig; }, 1200);
        });
      }
    });
  }

  // Update share URL when radio selection changes
  for (const radio of document.querySelectorAll('input[name="share-type"]')) {
    radio.addEventListener("change", updateShareUrl);
  }

  // GitHub Gist export
  if (els.githubGistButton) {
    els.githubGistButton.addEventListener("click", async () => {
      const token = els.githubTokenInput?.value?.trim();
      if (!token) {
        appendLog("GitHub token is required for Gist export.", true);
        return;
      }
      if (!activeBlueprint) {
        appendLog("No active blueprint to export.", true);
        return;
      }
      try {
        els.githubGistButton.disabled = true;
        els.githubGistButton.textContent = "Creating...";
        const { exportBlueprintAsGist, buildGistPlaygroundUrl } = await import("./github-export.js");
        const gist = await exportBlueprintAsGist(activeBlueprint, token);
        const playgroundUrl = buildGistPlaygroundUrl(gist.rawUrl, window.location.origin + window.location.pathname);
        if (els.githubGistResult) {
          els.githubGistResult.hidden = false;
          els.githubGistResult.textContent = "";
          const link = document.createElement("a");
          link.href = gist.url;
          link.target = "_blank";
          link.rel = "noreferrer";
          link.textContent = "View Gist";
          els.githubGistResult.append(link);
          const span = document.createElement("span");
          span.textContent = " | ";
          els.githubGistResult.append(span);
          const playLink = document.createElement("a");
          playLink.href = playgroundUrl;
          playLink.textContent = "Launch from Gist";
          els.githubGistResult.append(playLink);
        }
        appendLog(`Blueprint exported to Gist: ${gist.url}`);
      } catch (error) {
        appendLog(`Gist export failed: ${error.message}`, true);
      } finally {
        els.githubGistButton.disabled = false;
        els.githubGistButton.textContent = "Create Gist";
      }
    });
  }

  bindShellChannel();
  bindServiceWorkerMessages();
  setPhpInfoContent("");
  phpInfoCapturePromise = null;
  setUiLocked(true);

  const isLazy = new URLSearchParams(window.location.search).get("lazy") === "true";
  if (isLazy) {
    showLazySplash();
  } else {
    await updateFrame();
  }
}

els.home.addEventListener("click", () => {
  navigateWithinRuntime("/");
});

els.refresh.addEventListener("click", () => {
  navigateWithinRuntime(currentPath);
});

els.panelToggle.addEventListener("click", toggleSidePanel);
els.infoTab.addEventListener("click", () => setActivePanel("info"));
els.logsTab.addEventListener("click", () => setActivePanel("logs"));
els.phpInfoTab.addEventListener("click", () => {
  setActivePanel("phpinfo");
  capturePhpInfoViaWorker("tab-click");
});
els.blueprintTab.addEventListener("click", () => setActivePanel("blueprint"));
els.galleryTab.addEventListener("click", () => {
  setActivePanel("gallery");
  loadGallery();
});
if (els.gallerySearchInput) {
  els.gallerySearchInput.addEventListener("input", () => {
    filterGalleryCards(els.gallerySearchInput.value);
  });
}
els.clearLogs.addEventListener("click", () => {
  els.logPanel.textContent = "";
});
els.copyLogs.addEventListener("click", () => {
  const text = els.logPanel.textContent || "";
  navigator.clipboard.writeText(text).then(() => {
    const original = els.copyLogs.textContent;
    els.copyLogs.textContent = "Copied!";
    setTimeout(() => {
      els.copyLogs.textContent = original;
    }, 1200);
  });
});
els.refreshPhpInfoButton.addEventListener("click", requestPhpInfoCapture);

if (els.cronToggle) {
  els.cronToggle.addEventListener("change", () => {
    postCronMessage({
      kind: els.cronToggle.checked ? "cron-start" : "cron-stop",
    });
  });
}
if (els.cronRunNow) {
  els.cronRunNow.addEventListener("click", () => {
    postCronMessage({ kind: "cron-run-now" });
  });
}
if (els.cronInterval) {
  els.cronInterval.addEventListener("change", () => {
    const ms = Number(els.cronInterval.value);
    if (ms > 0) {
      postCronMessage({ kind: "cron-set-interval", interval: ms });
    }
  });
}

if (els.saveStateButton) {
  els.saveStateButton.addEventListener("click", () => {
    if (uiLocked) return;
    appendLog("Saving state to persistent storage...");
    postToRemote({ kind: "persistence-save" });
  });
}

if (els.resetStorageButton) {
  els.resetStorageButton.addEventListener("click", () => {
    if (uiLocked) return;
    if (!confirm("Clear all saved data? This cannot be undone.")) return;
    appendLog("Clearing persistent storage...");
    postToRemote({ kind: "persistence-reset" });
  });
}

if (els.exportSiteButton) {
  els.exportSiteButton.addEventListener("click", () => {
    if (uiLocked) return;
    appendLog("Exporting site state...");
    postToRemote({ kind: "site-export" });
  });
}

if (els.importSiteInput) {
  els.importSiteInput.addEventListener("change", async () => {
    const file = els.importSiteInput.files?.[0];
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      appendLog("Importing site state...");
      postToRemote({ kind: "site-import", data: buffer });
    } catch (error) {
      appendLog(`Import failed: ${error.message}`, true);
    } finally {
      els.importSiteInput.value = "";
    }
  });
}

els.addressForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (uiLocked) {
    return;
  }
  navigateWithinRuntime(els.address.value || "/");
});

els.exportButton.addEventListener("click", exportBlueprint);
els.importInput.addEventListener("change", async () => {
  const file = els.importInput.files?.[0];
  if (!file) {
    return;
  }

  try {
    await importPayload(file);
  } catch (error) {
    appendLog(String(error?.stack || error?.message || error), true);
  } finally {
    els.importInput.value = "";
  }
});

els.reset.addEventListener("click", async () => {
  if (uiLocked) {
    return;
  }
  clearScopeSession(scopeId);
  // Clear the imported blueprint unless it was supplied via URL parameter,
  // so a plain reset boots without any previously loaded blueprint.
  const url = new URL(window.location.href);
  if (
    !url.searchParams.has("blueprint") &&
    !url.searchParams.has("blueprint-url")
  ) {
    clearBlueprint(scopeId);
    activeBlueprint = await resolveBlueprint({
      scopeId,
      location: window.location,
      defaultBlueprintUrl: config.defaultBlueprintUrl,
    });
    updateBlueprintTextarea();
  }
  currentPath = activeBlueprint?.landingPage || config.landingPath || "/";
  els.address.value = currentPath;
  pendingCleanBoot = true;
  remoteFrameBooted = false;
  serviceWorkerReady = null;
  setPhpInfoContent("");
  phpInfoCapturePromise = null;
  void updateFrame();
});

main().catch((error) => {
  setUiLocked(false);
  appendLog(String(error?.stack || error?.message || error), true);
});
