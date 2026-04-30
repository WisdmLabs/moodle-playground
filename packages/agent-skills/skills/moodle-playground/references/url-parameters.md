# URL Parameters Reference

The Moodle Playground accepts query parameters for configuring the runtime environment.

## Version Selection

| Parameter | Values | Default | Description |
|-----------|--------|---------|-------------|
| `moodle` | `4.4`, `4.5`, `5.0`, `5.1`, `5.2`, `dev` | `5.0` | Moodle version |
| `moodleBranch` | `MOODLE_404_STABLE`, etc. | `MOODLE_500_STABLE` | Branch name (alternative to version) |
| `php` | `8.1`, `8.2`, `8.3`, `8.4`, `8.5` | `8.3` | PHP version |
| `phpVersion` | Same as `php` | `8.3` | Alias for `php` |

## Blueprint & Content

| Parameter | Format | Description |
|-----------|--------|-------------|
| `blueprint` | Base64-encoded JSON | Apply a blueprint on boot |
| `url` | URL path (e.g., `/admin/index.php`) | Landing page after boot |
| `login` | Username string | Auto-login as this user after boot |

## Plugins & Themes

| Parameter | Format | Description |
|-----------|--------|-------------|
| `plugin` | GitHub ZIP URL | Install plugin(s) on boot. Repeatable. |
| `theme` | Theme shortname | Set active theme |

## Display

| Parameter | Values | Description |
|-----------|--------|-------------|
| `mode` | `seamless`, `browser` | Display mode. `seamless` hides the shell chrome. |
| `lazy` | `true` | Defer boot until user interaction |

## Debugging

| Parameter | Values | Description |
|-----------|--------|-------------|
| `debug` | `true`, `false` | Enable runtime debug output |
| `profile` | `runtime`, `runtime-selection` | Enable performance profiling |

## Networking

| Parameter | Format | Description |
|-----------|--------|-------------|
| `addonProxyUrl` | URL | CORS proxy for browser-side ZIP downloads |
| `phpCorsProxyUrl` | URL | CORS proxy for PHP runtime networking |

## Localization

| Parameter | Values | Description |
|-----------|--------|-------------|
| `lang` | ISO language code | UI language (e.g., `es`, `fr`, `de`) |
| `language` | Same as `lang` | Alias |

## Import/Export

| Parameter | Format | Description |
|-----------|--------|-------------|
| `import-site` | URL to ZIP | Import a site state ZIP on boot |

## AI/MCP Integration

| Parameter | Format | Description |
|-----------|--------|-------------|
| `mcp` | `true` | Enable MCP bridge (postMessage) |
| `mcp-ws` | WebSocket URL | Connect to MCP server via WebSocket |
| `moodle-pr` | PR number | Load Moodle from a pull request branch |

## Version Compatibility Matrix

| Moodle | PHP 8.1 | PHP 8.2 | PHP 8.3 | PHP 8.4 | PHP 8.5 |
|--------|---------|---------|---------|---------|---------|
| 4.4 | Yes | Yes | Yes | — | — |
| 4.5 | Yes | Yes | Yes | — | — |
| 5.0 | — | Yes | Yes | Yes | — |
| 5.1 | — | Yes | Yes | Yes | — |
| 5.2 | — | Yes | Yes | Yes | — |
| dev | — | Yes | Yes | Yes | Yes |

Incompatible combinations fall back to the default PHP version for that Moodle branch.

## Examples

```
# Moodle 5.0 with PHP 8.3 (default)
https://playground.example.com/

# Moodle 4.5 LTS with PHP 8.2
https://playground.example.com/?moodle=4.5&php=8.2

# Auto-install a plugin
https://playground.example.com/?plugin=https://github.com/user/repo/archive/main.zip

# Blueprint with landing page
https://playground.example.com/?blueprint=eyJzdGVwcyI6W3sic3RlcCI6ImNyZWF0ZUNvdXJzZSJ9XX0=&url=/course/view.php?id=2

# Debug mode with Spanish UI
https://playground.example.com/?debug=true&lang=es

# Connect MCP server
https://playground.example.com/?mcp-ws=ws://localhost:7999?token=abc123
```
