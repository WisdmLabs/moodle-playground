import { escapePhp } from "../php/helpers.js";

const MOODLE_ROOT = "/www/moodle";

const CLI_HEADER = `<?php
define('CLI_SCRIPT', true);
require('${MOODLE_ROOT}/config.php');
`;

export function registerMoodleDatabaseSteps(register) {
  register("runSql", handleRunSql);
  register("runSqlFile", handleRunSqlFile);
  register("resetData", handleResetData);
  register("applyPatch", handleApplyPatch);
}

async function handleRunSql(step, { php }) {
  if (!step.sql) throw new Error("runSql: 'sql' is required.");
  const code = `${CLI_HEADER}
global $DB;
$DB->execute('${escapePhp(step.sql)}');
echo json_encode(['ok' => true]);
`;
  await php.run(code);
}

async function handleRunSqlFile(step, { php, resources }) {
  if (!step.file) throw new Error("runSqlFile: 'file' is required.");
  let sqlContent;
  if (resources) {
    const bytes = await resources.resolve(step.file);
    sqlContent = new TextDecoder().decode(bytes);
  } else {
    throw new Error("runSqlFile: resource registry not available.");
  }
  const code = `${CLI_HEADER}
global $DB;
$statements = explode(';', '${escapePhp(sqlContent)}');
foreach ($statements as $stmt) {
  $stmt = trim($stmt);
  if ($stmt !== '') { $DB->execute($stmt); }
}
echo json_encode(['ok' => true]);
`;
  await php.run(code);
}

async function handleApplyPatch(step, _context) {
  const url = step.patchUrl || step.url;
  console.warn(
    `[blueprint] applyPatch: Patch application from ${url} is not yet implemented. ` +
      `The Moodle core is extracted from a prebuilt ZIP bundle, and applying git patches ` +
      `at runtime requires a diff-apply mechanism that is planned for a future release.`,
  );
}

async function handleResetData(step, { php }) {
  const targets = step.targets || ["courses", "users"];
  const parts = [];
  if (targets.includes("courses")) {
    parts.push("$DB->delete_records_select('course', 'id > 1');");
  }
  if (targets.includes("users")) {
    parts.push(
      "$DB->delete_records_select('user', \"id > 2 AND deleted = 0\");",
    );
  }
  if (targets.includes("categories")) {
    parts.push(
      "$DB->delete_records_select('course_categories', 'id > 1');",
    );
  }
  const code = `${CLI_HEADER}
global $DB;
${parts.join("\n")}
purge_all_caches();
echo json_encode(['ok' => true]);
`;
  await php.run(code);
}
