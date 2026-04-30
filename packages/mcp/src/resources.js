export const RESOURCE_DEFINITIONS = [
  {
    uri: "moodle://site/info",
    name: "Site Information",
    description: "Moodle site name, version, release, PHP version, and admin user",
    mimeType: "application/json",
  },
  {
    uri: "moodle://site/config",
    name: "Site Configuration",
    description: "Current Moodle configuration values (core settings)",
    mimeType: "application/json",
  },
  {
    uri: "moodle://site/courses",
    name: "Course List",
    description: "List of courses with IDs, shortnames, and fullnames",
    mimeType: "application/json",
  },
  {
    uri: "moodle://site/users",
    name: "User List",
    description: "List of users with IDs, usernames, and roles",
    mimeType: "application/json",
  },
  {
    uri: "moodle://site/plugins",
    name: "Installed Plugins",
    description: "Installed plugins with versions and status",
    mimeType: "application/json",
  },
  {
    uri: "moodle://blueprint/current",
    name: "Current Blueprint",
    description: "The currently active blueprint JSON",
    mimeType: "application/json",
  },
  {
    uri: "moodle://logs/recent",
    name: "Recent Logs",
    description: "Recent Moodle log entries",
    mimeType: "application/json",
  },
];

const RESOURCE_PHP = {
  "moodle://site/info": `<?php
define('CLI_SCRIPT', true);
require('/www/moodle/config.php');
echo json_encode([
  'sitename' => $SITE->fullname ?? '',
  'version' => $CFG->version ?? '',
  'release' => $CFG->release ?? '',
  'moodleVersion' => moodle_major_version(),
  'phpVersion' => PHP_VERSION,
  'wwwroot' => $CFG->wwwroot,
  'dbtype' => $CFG->dbtype,
]);`,

  "moodle://site/config": `<?php
define('CLI_SCRIPT', true);
require('/www/moodle/config.php');
global $DB;
$records = $DB->get_records('config', null, 'name ASC', 'name,value', 0, 100);
$config = [];
foreach ($records as $r) { $config[$r->name] = $r->value; }
echo json_encode($config);`,

  "moodle://site/courses": `<?php
define('CLI_SCRIPT', true);
require('/www/moodle/config.php');
global $DB;
$courses = $DB->get_records('course', null, 'id ASC', 'id,shortname,fullname,category,visible,format');
echo json_encode(array_values($courses));`,

  "moodle://site/users": `<?php
define('CLI_SCRIPT', true);
require('/www/moodle/config.php');
global $DB;
$users = $DB->get_records('user', ['deleted' => 0], 'id ASC', 'id,username,firstname,lastname,email,auth', 0, 100);
echo json_encode(array_values($users));`,

  "moodle://site/plugins": `<?php
define('CLI_SCRIPT', true);
require('/www/moodle/config.php');
$pm = core_plugin_manager::instance();
$result = [];
foreach (['mod', 'local', 'block', 'theme', 'auth', 'enrol', 'tool'] as $type) {
  $plugins = $pm->get_plugins_of_type($type);
  foreach ($plugins as $name => $info) {
    $result[] = [
      'component' => $info->component,
      'type' => $type,
      'name' => $name,
      'version' => $info->versiondisk ?? null,
      'status' => $info->get_status(),
    ];
  }
}
echo json_encode($result);`,

  "moodle://logs/recent": `<?php
define('CLI_SCRIPT', true);
require('/www/moodle/config.php');
global $DB;
try {
  $logs = $DB->get_records('logstore_standard_log', null, 'id DESC', 'id,eventname,action,target,userid,timecreated', 0, 50);
  echo json_encode(array_values($logs));
} catch (Exception $e) {
  echo json_encode([]);
}`,
};

export async function readResource(uri, wsBridge) {
  if (uri === "moodle://blueprint/current") {
    const result = await wsBridge.callTool("moodle/getBlueprint", {});
    return JSON.stringify(result, null, 2);
  }

  const phpCode = RESOURCE_PHP[uri];
  if (!phpCode) {
    throw new Error(`Unknown resource: ${uri}`);
  }

  const result = await wsBridge.callTool("moodle/runPhp", { code: phpCode });
  return typeof result === "string" ? result : JSON.stringify(result, null, 2);
}
