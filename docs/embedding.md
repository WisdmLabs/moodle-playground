# Embedding Moodle Playground

Embed a Moodle Playground instance on any website using an iframe.

## Basic embed

```html
<iframe
  src="https://moodle-playground.com/?mode=seamless"
  style="width: 100%; height: 600px; border: none;"
></iframe>
```

## With a blueprint

```html
<iframe
  src="https://moodle-playground.com/?mode=seamless&blueprint-url=https://example.com/my-blueprint.json"
  style="width: 100%; height: 600px; border: none;"
></iframe>
```

## With plugins pre-installed

```html
<iframe
  src="https://moodle-playground.com/?mode=seamless&plugin=mod_board&url=/course/view.php?id=2"
  style="width: 100%; height: 600px; border: none;"
></iframe>
```

## Query parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `mode=seamless` | Hide toolbar and sidebar | `?mode=seamless` |
| `lazy=true` | Defer boot until user clicks | `?lazy=true` |
| `plugin=<name>` | Install plugin (repeatable) | `?plugin=mod_board` |
| `theme=<name>` | Set theme | `?theme=moove` |
| `lang=<code>` | Set site language | `?lang=es` |
| `url=<path>` | Set landing page | `?url=/course/view.php?id=2` |
| `login=no` | Skip auto-login | `?login=no` |
| `moodle=<ver>` | Set Moodle version | `?moodle=5.0` |
| `php=<ver>` | Set PHP version | `?php=8.3` |
| `blueprint=<json>` | Inline blueprint (base64 or JSON) | `?blueprint=...` |
| `blueprint-url=<url>` | Remote blueprint URL | `?blueprint-url=https://...` |

## Shareable URLs

Use the Share button in the toolbar to generate a shareable URL. Two modes:

- **Blueprint only**: Encodes the active blueprint in the URL hash. Lightweight, no state.
- **Query parameters**: Encodes version selections as URL parameters.
