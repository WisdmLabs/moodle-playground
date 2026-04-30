import {
  escapePhp,
  phpSetConfig,
  phpSetConfigs,
  phpSetSiteLanguage,
  phpSetTheme,
} from "../php/helpers.js";

export function registerMoodleConfigSteps(register) {
  register("setConfig", handleSetConfig);
  register("setConfigs", handleSetConfigs);
  register("setTheme", handleSetTheme);
  register("setLandingPage", handleSetLandingPage);
  register("setSiteLanguage", handleSetSiteLanguage);
  register("defineConfigConstants", handleDefineConfigConstants);
}

async function handleSetTheme(step, { php }) {
  if (!step.name) throw new Error("setTheme: 'name' is required.");
  const code = phpSetTheme(step.name);
  await php.run(code);
}

async function handleSetConfig(step, { php }) {
  if (!step.name) throw new Error("setConfig: 'name' is required.");
  const code = phpSetConfig(step.name, step.value ?? "", step.plugin || null);
  await php.run(code);
}

async function handleSetConfigs(step, { php }) {
  if (!Array.isArray(step.configs))
    throw new Error("setConfigs: 'configs' must be an array.");
  const code = phpSetConfigs(step.configs);
  await php.run(code);
}

async function handleSetLandingPage(step, _context) {
  // The landing page is captured by the executor from step.path.
  // No PHP execution needed.
  if (!step.path) throw new Error("setLandingPage: 'path' is required.");
  return { landingPage: step.path };
}

async function handleSetSiteLanguage(step, { php }) {
  if (!step.language)
    throw new Error("setSiteLanguage: 'language' is required.");
  const code = phpSetSiteLanguage(step.language);
  await php.run(code);
}

async function handleDefineConfigConstants(step, { php }) {
  if (!step.constants || typeof step.constants !== "object") {
    throw new Error("defineConfigConstants: 'constants' object is required.");
  }
  const webRoot = "/www/moodle";
  const configPath = `${webRoot}/config.php`;
  let config;
  try {
    config = new TextDecoder().decode(php.readFileAsBuffer(configPath));
  } catch {
    throw new Error("defineConfigConstants: cannot read config.php");
  }

  const defines = Object.entries(step.constants)
    .map(([k, v]) => {
      const val = typeof v === "string" ? `'${escapePhp(v)}'` : String(v);
      return `define('${escapePhp(k)}', ${val});`;
    })
    .join("\n");

  config = config.replace(
    /require_once\(__DIR__\s*\.\s*'\/lib\/setup\.php'\);/,
    `${defines}\nrequire_once(__DIR__ . '/lib/setup.php');`,
  );

  php.writeFile(configPath, config);
}
