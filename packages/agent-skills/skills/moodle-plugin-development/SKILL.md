# Moodle Plugin Development in Playground — Agent Skill

You are helping develop Moodle plugins using Moodle Playground as the test environment. Plugins are written to the in-memory filesystem and tested live in the browser — no server setup required.

## Plugin Development Workflow

1. **Create the plugin directory** using `moodle/mkdir`
2. **Write plugin files** using `moodle/writeFile`
3. **Trigger upgrade** by navigating to `/admin/index.php`
4. **Verify** by checking logs, running PHP, or navigating to the plugin

### Example: Create a local plugin

```
moodle/mkdir  { "path": "/www/moodle/local/greetings" }
moodle/mkdir  { "path": "/www/moodle/local/greetings/classes" }
moodle/mkdir  { "path": "/www/moodle/local/greetings/lang/en" }
```

```
moodle/writeFile  {
  "path": "/www/moodle/local/greetings/version.php",
  "data": "<?php\ndefined('MOODLE_INTERNAL') || die();\n$plugin->component = 'local_greetings';\n$plugin->version = 2024010100;\n$plugin->requires = 2024042200;\n"
}
```

```
moodle/writeFile  {
  "path": "/www/moodle/local/greetings/lang/en/local_greetings.php",
  "data": "<?php\n$string['pluginname'] = 'Greetings';\n"
}
```

```
moodle/navigate  { "path": "/admin/index.php" }
```

## Plugin File Structure

Every Moodle plugin requires at minimum:

```
plugintype/pluginname/
  version.php          # Required: component name, version, requirements
  lang/en/type_name.php  # Required: language strings (at least 'pluginname')
```

### version.php (required)

```php
<?php
defined('MOODLE_INTERNAL') || die();

$plugin->component = 'local_example';     // frankenstyle name
$plugin->version   = 2024010100;          // YYYYMMDDXX format
$plugin->requires  = 2024042200;          // minimum Moodle version
$plugin->maturity  = MATURITY_STABLE;     // ALPHA, BETA, RC, STABLE
$plugin->release   = '1.0.0';            // human-readable version
```

### Language file (required)

```php
<?php
// lang/en/local_example.php
$string['pluginname'] = 'Example Plugin';
```

## Plugin Types and Paths

See `references/plugin-types.md` for the complete list. Common types:

| Type | Path | Frankenstyle | Example |
|------|------|-------------|---------|
| Activity module | `mod/` | `mod_name` | `mod_quiz` |
| Local plugin | `local/` | `local_name` | `local_greetings` |
| Block | `blocks/` | `block_name` | `block_news` |
| Admin tool | `admin/tool/` | `tool_name` | `tool_uploaduser` |
| Authentication | `auth/` | `auth_name` | `auth_oauth2` |
| Theme | `theme/` | `theme_name` | `theme_boost` |
| Report | `report/` | `report_name` | `report_log` |

## Common Plugin Files

| File | Purpose |
|------|---------|
| `db/install.xml` | Database schema (XMLDB format) |
| `db/upgrade.php` | Schema migration between versions |
| `db/access.php` | Capability definitions |
| `db/services.php` | Web service function definitions |
| `db/events.php` | Event observer definitions |
| `classes/` | Autoloaded PHP classes (PSR-4 style) |
| `settings.php` | Admin settings page |
| `index.php` | Plugin listing page |
| `lib.php` | Callback functions (hooks) |

## Testing in Playground

See `references/testing-in-playground.md` for detailed testing strategies.

### Quick verification

```php
// Check plugin is installed
moodle/runPhp  {
  "code": "<?php\ndefine('CLI_SCRIPT', true);\nrequire('/www/moodle/config.php');\n$pm = core_plugin_manager::instance();\n$info = $pm->get_plugin_info('local_greetings');\necho json_encode(['version' => $info->versiondisk, 'status' => $info->get_status()]);"
}
```

### Check for errors

```php
moodle/runPhp  {
  "code": "<?php\ndefine('CLI_SCRIPT', true);\nrequire('/www/moodle/config.php');\n$errors = get_config('', 'upgraderunning');\necho $errors ? 'Upgrade in progress' : 'OK';"
}
```

## SQLite Constraints

The playground uses SQLite, not MySQL. Key differences:

- No `ENUM` type — use `VARCHAR` with validation
- No `UNSIGNED` — all integers are signed
- `GROUP BY` is strict — all selected columns must be in GROUP BY or aggregated
- `REPLACE INTO` works differently — prefer `INSERT ... ON CONFLICT`
- Text comparison is case-sensitive by default
- No `FULLTEXT` indexes
- Limited `ALTER TABLE` support (no DROP COLUMN before SQLite 3.35)

When writing `db/install.xml`, stick to XMLDB types: `int`, `char`, `text`, `float`, `binary`.

## Debugging

```php
// Enable developer debug mode
moodle/setConfig  { "name": "debug", "value": "32767" }
moodle/setConfig  { "name": "debugdisplay", "value": "1" }
```

```php
// Check error logs
moodle/runPhp  {
  "code": "<?php\ndefine('CLI_SCRIPT', true);\nrequire('/www/moodle/config.php');\nglobal $DB;\n$logs = $DB->get_records('logstore_standard_log', null, 'id DESC', '*', 0, 20);\nforeach ($logs as $log) { echo \"{$log->eventname}: {$log->action}\\n\"; }"
}
```

## Installing from GitHub

```
moodle/installPlugin  {
  "url": "https://github.com/moodlehq/moodle-mod_subcourse/archive/refs/heads/main.zip"
}
```

Plugin type and name are auto-detected from `version.php` inside the ZIP. The plugin is extracted, and Moodle's upgrade process runs automatically.
