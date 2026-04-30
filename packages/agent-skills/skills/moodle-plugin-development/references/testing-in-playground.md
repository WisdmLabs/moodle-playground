# Testing Plugins in Moodle Playground

Strategies for testing Moodle plugins using the playground's MCP tools.

## Verification Workflow

### 1. Check plugin is recognized

After writing plugin files and navigating to `/admin/index.php`:

```json
// moodle/runPhp
{
  "code": "<?php\ndefine('CLI_SCRIPT', true);\nrequire('/www/moodle/config.php');\n$pm = core_plugin_manager::instance();\n$plugins = $pm->get_plugins_of_type('local');\nforeach ($plugins as $name => $info) {\n    echo \"$name: v{$info->versiondisk} ({$info->get_status()})\\n\";\n}"
}
```

### 2. Check database tables were created

```json
// moodle/runPhp
{
  "code": "<?php\ndefine('CLI_SCRIPT', true);\nrequire('/www/moodle/config.php');\nglobal $DB;\n$tables = $DB->get_tables();\nforeach ($tables as $table) {\n    if (strpos($table, 'local_greetings') !== false) echo \"$table\\n\";\n}"
}
```

### 3. Verify capabilities are registered

```json
// moodle/runPhp
{
  "code": "<?php\ndefine('CLI_SCRIPT', true);\nrequire('/www/moodle/config.php');\nglobal $DB;\n$caps = $DB->get_records_select('capabilities', \"name LIKE 'local/greetings%'\");\nforeach ($caps as $cap) echo \"{$cap->name} ({$cap->riskbitmask})\\n\";"
}
```

### 4. Test web service functions

```json
// moodle/runPhp
{
  "code": "<?php\ndefine('CLI_SCRIPT', true);\nrequire('/www/moodle/config.php');\nrequire_once($CFG->libdir . '/externallib.php');\n$result = local_greetings_external::get_greeting('World');\necho json_encode($result);"
}
```

### 5. Test navigation and UI

```json
// moodle/navigate
{ "path": "/local/greetings/index.php" }
```

Then check the current URL:
```json
// moodle/getCurrentUrl
```

## Common Testing Patterns

### Test admin settings

```json
// moodle/runPhp
{
  "code": "<?php\ndefine('CLI_SCRIPT', true);\nrequire('/www/moodle/config.php');\nset_config('greeting_text', 'Hello!', 'local_greetings');\necho get_config('local_greetings', 'greeting_text');"
}
```

### Test event observers

```json
// moodle/runPhp
{
  "code": "<?php\ndefine('CLI_SCRIPT', true);\nrequire('/www/moodle/config.php');\n$event = \\core\\event\\course_viewed::create(['context' => context_system::instance(), 'objectid' => 1]);\n$event->trigger();\necho 'Event triggered';"
}
```

### Test scheduled tasks

```json
// moodle/runPhp
{
  "code": "<?php\ndefine('CLI_SCRIPT', true);\nrequire('/www/moodle/config.php');\n$task = new \\local_greetings\\task\\cleanup();\n$task->execute();\necho 'Task executed';"
}
```

### Test with different roles

```json
// Create a test user
// moodle/runPhp
{
  "code": "<?php\ndefine('CLI_SCRIPT', true);\nrequire('/www/moodle/config.php');\n$user = new stdClass();\n$user->username = 'testuser';\n$user->password = 'Test1234!';\n$user->firstname = 'Test';\n$user->lastname = 'User';\n$user->email = 'test@example.com';\n$user->confirmed = 1;\n$user->mnethostid = $CFG->mnet_localhost_id;\n$user->id = user_create_user($user, true, false);\necho \"User created: id={$user->id}\";"
}
```

## Iterative Development Loop

1. **Write/update files** with `moodle/writeFile`
2. **Bump version** in `version.php` (increment the last two digits)
3. **Run upgrade** with `moodle/navigate { "path": "/admin/index.php" }`
4. **Check for errors** with `moodle/runPhp` (check `$CFG->debug` output)
5. **Test functionality** with `moodle/runPhp` or `moodle/navigate`
6. **Repeat** as needed

### Version bumping

Each change to `db/install.xml`, `db/access.php`, `db/services.php`, or `lang/` files requires a version bump in `version.php`. Increment the last two digits:

```
2024010100 → 2024010101 → 2024010102
```

## Debugging Failed Installs

If the plugin fails to install:

```json
// moodle/runPhp
{
  "code": "<?php\ndefine('CLI_SCRIPT', true);\nrequire('/www/moodle/config.php');\n// Check for syntax errors in plugin files\n$files = ['version.php', 'lib.php', 'db/access.php'];\nforeach ($files as $f) {\n    $path = '/www/moodle/local/greetings/' . $f;\n    if (file_exists($path)) {\n        $result = php_check_syntax($path) ?? 'OK';\n        echo \"$f: $result\\n\";\n    }\n}"
}
```

Check the file actually exists:
```json
// moodle/fileExists
{ "path": "/www/moodle/local/greetings/version.php" }
```

Read it back to verify content:
```json
// moodle/readFile
{ "path": "/www/moodle/local/greetings/version.php" }
```

## Limitations

- **No PHPUnit**: The playground doesn't support running PHPUnit tests directly. Test via API calls and manual verification.
- **No Behat**: Browser automation tests aren't supported in the sandbox.
- **Single session**: All requests are sequential — no concurrency testing.
- **Memory**: Large test datasets may exceed the WASM memory limit (~256MB).
- **No cron**: Scheduled tasks don't run automatically. Trigger them manually with `moodle/runPhp`.
