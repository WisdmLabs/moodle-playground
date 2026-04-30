import { parseQueryParams } from "../shared/version-resolver.js";
import { parseBlueprint } from "./parser.js";
import { validateBlueprint } from "./schema.js";
import { saveBlueprint } from "./storage.js";

/**
 * Resolve the active blueprint from multiple sources in priority order.
 *
 * Precedence:
 *   1. ?blueprint= query param (inline JSON / base64 / data-URL)
 *   2. ?blueprint-url= query param (remote URL)
 *   3. Query param shortcuts (?plugin=, ?theme=, ?url=, ?lang=)
 *   4. sessionStorage
 *   5. defaultBlueprintUrl (fetch)
 *   6. Built-in minimal default
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

  if (loc) {
    const url = new URL(loc.href);

    // 1. ?blueprint= (inline)
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

    // 2. ?blueprint-url= (remote)
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
        if (
          blueprintUrlParam.endsWith(".zip") ||
          contentType.includes("zip")
        ) {
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

  // 3. Query param shortcuts (?plugin=, ?theme=, ?url=, ?lang=)
  if (loc) {
    const queryParams = parseQueryParams(loc);
    const paramBlueprint = buildBlueprintFromParams(queryParams);
    if (paramBlueprint) {
      console.log("[blueprint] Resolved from query param shortcuts.");
      saveBlueprint(scopeId, paramBlueprint);
      return paramBlueprint;
    }
  }

  // 4. sessionStorage blueprints are not reloaded on bare URL navigations —
  //    the ephemeral runtime should boot clean. Blueprints from ?blueprint=
  //    params are returned above before reaching this point.

  // 5. defaultBlueprintUrl
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

  // 6. Built-in minimal default
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
