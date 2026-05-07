import { parseQueryParams } from "../shared/version-resolver.js";
import { parseBlueprint } from "./parser.js";
import { validateBlueprint } from "./schema.js";
import { saveBlueprint } from "./storage.js";

/**
 * Resolve a blueprint from the URL hash/fragment.
 *
 * Supports two encodings:
 *   - Raw JSON (URL-encoded or plain)
 *   - Base64-encoded JSON (with encodeURIComponent inside btoa)
 *
 * @param {Location} loc - Location object to read the hash from.
 * @returns {object|null} Parsed blueprint, or null if the hash is empty/invalid.
 */
function resolveFromFragment(loc) {
  const hash = loc.hash?.slice(1);
  if (!hash) return null;

  try {
    return JSON.parse(decodeURIComponent(hash));
  } catch {
    try {
      const json = decodeURIComponent(escape(atob(hash)));
      return JSON.parse(json);
    } catch {
      return null;
    }
  }
}

/**
 * Resolve the active blueprint from multiple sources in priority order.
 *
 * Precedence:
 *   1. URL hash/fragment (base64 or JSON-encoded blueprint)
 *   2. ?blueprint= query param (inline JSON / base64 / data-URL)
 *   3. ?blueprint-url= query param (remote URL)
 *   4. Query param shortcuts (?plugin=, ?theme=, ?url=, ?lang=)
 *   5. ?import-site= (deferred - handled by worker after runtime boot)
 *   6. sessionStorage
 *   7. defaultBlueprintUrl (fetch)
 *   8. Built-in minimal default
 *
 * @param {{ scopeId: string, location?: Location, defaultBlueprintUrl?: string }} options
 * @returns {Promise<object>} Resolved blueprint object.
 */
export async function resolveBlueprint({
  scopeId,
  location,
  defaultBlueprintUrl,
} = {}) {
  const loc =
    location || (typeof window !== "undefined" ? window.location : null);

  // 1. URL hash/fragment (base64 or JSON-encoded blueprint)
  if (loc) {
    const fragmentBlueprint = resolveFromFragment(loc);
    if (fragmentBlueprint) {
      console.log("[blueprint] Resolved from URL fragment.");
      saveBlueprint(scopeId, fragmentBlueprint);
      return fragmentBlueprint;
    }
  }

  if (loc) {
    const url = new URL(loc.href);

    // 2. ?blueprint= (inline)
    const blueprintParam = url.searchParams.get("blueprint");
    if (blueprintParam) {
      try {
        const blueprint = parseBlueprint(blueprintParam);
        console.log("[blueprint] Resolved from ?blueprint= param (inline).");
        saveBlueprint(scopeId, blueprint);
        return blueprint;
      } catch (error) {
        console.warn(
          "[blueprint] Failed to parse ?blueprint= param:",
          error.message,
        );
      }
    }

    // 3. ?blueprint-url= (remote)
    const blueprintUrlParam = url.searchParams.get("blueprint-url");
    if (blueprintUrlParam) {
      try {
        const response = await fetch(new URL(blueprintUrlParam, loc.href), {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        let blueprint;
        const contentType = response.headers.get("content-type") || "";
        if (blueprintUrlParam.endsWith(".zip") || contentType.includes("zip")) {
          blueprint = await resolveBundleZip(response);
        } else {
          blueprint = await response.json();
        }

        const validation = validateBlueprint(blueprint);
        if (!validation.valid) {
          throw new Error(`Invalid blueprint: ${validation.errors.join(", ")}`);
        }
        console.log("[blueprint] Resolved from ?blueprint-url= param.");
        saveBlueprint(scopeId, blueprint);
        return blueprint;
      } catch (error) {
        console.warn(
          "[blueprint] Failed to fetch ?blueprint-url=:",
          error.message,
        );
      }
    }
  }

  // 4. Query param shortcuts (?plugin=, ?theme=, ?url=, ?lang=)
  if (loc) {
    const queryParams = parseQueryParams(loc);
    const paramBlueprint = buildBlueprintFromParams(queryParams);
    if (paramBlueprint) {
      console.log("[blueprint] Resolved from query param shortcuts.");
      saveBlueprint(scopeId, paramBlueprint);
      return paramBlueprint;
    }
  }

  // 4b. ?moodle-pr= (apply a Moodle core PR patch)
  if (loc) {
    const moodlePr = new URL(loc.href).searchParams.get("moodle-pr");
    if (moodlePr) {
      console.log(
        `[blueprint] Generating blueprint for Moodle PR #${moodlePr}.`,
      );
      const prBlueprint = buildPrBlueprint(moodlePr, parseQueryParams(loc));
      saveBlueprint(scopeId, prBlueprint);
      return prBlueprint;
    }
  }

  // 5. ?import-site= (deferred - handled by worker after runtime boot)
  if (loc) {
    const importSiteUrl = new URL(loc.href).searchParams.get("import-site");
    if (importSiteUrl) {
      console.log(
        "[blueprint] import-site= detected, using minimal blueprint for boot.",
      );
      const minimal = {
        landingPage: "/",
        preferredVersions: { php: "8.3", moodle: "5.0" },
        steps: [{ step: "installMoodle" }],
        _importSiteUrl: importSiteUrl,
      };
      saveBlueprint(scopeId, minimal);
      return minimal;
    }
  }

  // 6. sessionStorage blueprints are not reloaded on bare URL navigations —
  //    the ephemeral runtime should boot clean. Blueprints from ?blueprint=
  //    params are returned above before reaching this point.

  // 7. defaultBlueprintUrl
  if (defaultBlueprintUrl) {
    try {
      const base = loc ? loc.href : undefined;
      const response = await fetch(new URL(defaultBlueprintUrl, base), {
        cache: "no-store",
      });
      if (response.ok) {
        const blueprint = await response.json();
        const validation = validateBlueprint(blueprint);
        if (!validation.valid) {
          console.warn(
            "[blueprint] Default blueprint invalid:",
            validation.errors,
          );
        }
        console.log("[blueprint] Resolved from defaultBlueprintUrl.");
        saveBlueprint(scopeId, blueprint);
        return blueprint;
      }
    } catch (error) {
      console.warn(
        "[blueprint] Failed to fetch default blueprint URL:",
        error.message,
      );
    }
  }

  // 8. Built-in minimal default
  console.log("[blueprint] Using built-in default.");
  const fallback = buildMinimalDefault();
  saveBlueprint(scopeId, fallback);
  return fallback;
}

async function resolveBundleZip(response) {
  const { unzipSync } = await import("fflate");
  const buffer = await response.arrayBuffer();
  const files = unzipSync(new Uint8Array(buffer));

  const blueprintData = files["blueprint.json"];
  if (!blueprintData) {
    throw new Error("No blueprint.json found in bundle ZIP");
  }

  const blueprint = JSON.parse(new TextDecoder().decode(blueprintData));

  // Store bundled files for use by steps
  blueprint._bundledFiles = {};
  for (const [path, data] of Object.entries(files)) {
    if (path !== "blueprint.json") {
      blueprint._bundledFiles[path] = data;
    }
  }

  return blueprint;
}

function buildMinimalDefault() {
  return {
    landingPage: "/",
    preferredVersions: { php: "8.3", moodle: "5.0" },
    constants: {
      ADMIN_USER: "admin",
      ADMIN_PASS: "password",
      ADMIN_EMAIL: "admin@example.com",
    },
    steps: [
      {
        step: "installMoodle",
        options: {
          adminUser: "admin",
          adminPass: "password",
          adminEmail: "admin@example.com",
          siteName: "Moodle Playground",
          locale: "en",
          timezone: "UTC",
        },
      },
      { step: "login", username: "admin" },
      { step: "setLandingPage", path: "/my/" },
    ],
  };
}

/**
 * Build a blueprint for testing a Moodle core pull request.
 *
 * Generates a blueprint with an `applyPatch` step that references the PR's diff URL.
 * The patch application is currently a stub — full runtime patch support is planned.
 *
 * @param {string} prNumber - The Moodle core PR number.
 * @param {object} queryParams - Parsed query params (for php/moodle version overrides).
 * @returns {object} Blueprint object.
 */
function buildPrBlueprint(prNumber, queryParams) {
  const patchUrl = `https://github.com/moodle/moodle/pull/${encodeURIComponent(prNumber)}.diff`;
  return {
    landingPage: queryParams.url || "/",
    preferredVersions: {
      php: queryParams.php || "8.3",
      moodle: queryParams.moodle || "dev",
    },
    steps: [
      { step: "installMoodle" },
      {
        step: "applyPatch",
        patchUrl,
        description: `Apply Moodle PR #${prNumber}`,
      },
      { step: "login", username: "admin" },
    ],
  };
}

/**
 * Build a blueprint from query param shortcuts.
 *
 * Only triggers when at least one of plugin, theme, url, or lang is provided.
 * This allows one-click install links like:
 *   ?plugin=mod_board&theme=moove&lang=es
 *
 * @param {object} queryParams - Parsed query params from parseQueryParams().
 * @returns {object|null} Blueprint object, or null if no shortcut params are present.
 */
export function buildBlueprintFromParams(queryParams) {
  const hasPlugins = queryParams.plugin && queryParams.plugin.length > 0;
  const hasTheme = !!queryParams.theme;
  const hasLang = !!queryParams.lang;
  const hasUrl = !!queryParams.url;

  if (!hasPlugins && !hasTheme && !hasLang && !hasUrl) {
    return null;
  }

  const steps = [{ step: "installMoodle" }];

  if (queryParams.login !== "no") {
    steps.push({ step: "login", username: "admin" });
  }

  if (hasPlugins) {
    for (const pluginUrl of queryParams.plugin) {
      steps.push({ step: "installPlugin", pluginUrl });
    }
  }

  if (hasTheme) {
    steps.push({ step: "setTheme", name: queryParams.theme });
  }

  if (hasLang) {
    steps.push({ step: "setSiteLanguage", language: queryParams.lang });
  }

  if (hasUrl) {
    steps.push({ step: "setLandingPage", path: queryParams.url });
  }

  return {
    landingPage: queryParams.url || "/my/",
    preferredVersions: {
      php: queryParams.php || "8.3",
      moodle: queryParams.moodle || "5.0",
    },
    steps,
  };
}
