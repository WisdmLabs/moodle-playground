/**
 * Share URL generators for the Moodle Playground.
 *
 * Two modes:
 *   - Blueprint share: encodes the full blueprint JSON in the URL fragment (hash).
 *   - Query param share: encodes version/plugin/theme selections as query params.
 */

/**
 * Generate a shareable URL with the blueprint encoded in the URL hash.
 *
 * @param {object} blueprint - The blueprint object to encode.
 * @param {string} baseUrl - The base URL to build the share link from.
 * @returns {string} Full URL with blueprint in the hash fragment.
 */
export function generateBlueprintShareUrl(blueprint, baseUrl) {
  const json = JSON.stringify(blueprint);
  const encoded = btoa(unescape(encodeURIComponent(json)));
  const url = new URL(baseUrl);
  url.hash = encoded;
  return url.toString();
}

/**
 * Generate a shareable URL with playground options as query parameters.
 *
 * @param {object} options - Playground options to encode.
 * @param {string} [options.moodle] - Moodle version.
 * @param {string} [options.php] - PHP version.
 * @param {string} [options.mode] - Display mode (e.g. "seamless").
 * @param {string[]} [options.plugins] - Plugin URLs to install.
 * @param {string} [options.theme] - Theme name.
 * @param {string} [options.lang] - Language code.
 * @param {string} [options.landingUrl] - Landing page path.
 * @param {boolean} [options.login] - Whether to auto-login (false = skip).
 * @param {string} baseUrl - The base URL to build the share link from.
 * @returns {string} Full URL with options as query parameters.
 */
export function generateQueryParamShareUrl(options, baseUrl) {
  const url = new URL(baseUrl);
  if (options.moodle) url.searchParams.set("moodle", options.moodle);
  if (options.php) url.searchParams.set("php", options.php);
  if (options.mode) url.searchParams.set("mode", options.mode);
  if (options.plugins) {
    for (const p of options.plugins) {
      url.searchParams.append("plugin", p);
    }
  }
  if (options.theme) url.searchParams.set("theme", options.theme);
  if (options.lang) url.searchParams.set("lang", options.lang);
  if (options.landingUrl) url.searchParams.set("url", options.landingUrl);
  if (options.login === false) url.searchParams.set("login", "no");
  return url.toString();
}
