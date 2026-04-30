import { escapePhp } from "../php/helpers.js";

const MOODLE_ROOT = "/www/moodle";

const CLI_HEADER = `<?php
define('CLI_SCRIPT', true);
require('${MOODLE_ROOT}/config.php');
`;

export function registerMoodleBackupSteps(register) {
  register("restoreCourseBackup", handleRestoreCourseBackup);
}

async function handleRestoreCourseBackup(step, { php, resources }) {
  if (!step.file) {
    throw new Error(
      "restoreCourseBackup: 'file' is required (resource reference to .mbz file).",
    );
  }

  let mbzData;
  if (resources) {
    mbzData = await resources.resolve(step.file);
  } else {
    throw new Error("restoreCourseBackup: resource registry not available.");
  }

  const tempPath = "/tmp/moodle/restore_backup.mbz";
  const tempDir = "/tmp/moodle";

  // Ensure temp directory exists
  try {
    if (!php.isDir(tempDir)) {
      php.mkdir(tempDir);
    }
  } catch {
    try {
      php.mkdir(tempDir);
    } catch {
      /* exists */
    }
  }

  // Write .mbz file to MEMFS
  php.writeFile(tempPath, mbzData);

  const categoryId = step.categoryId || 1;
  const code = `${CLI_HEADER}
require_once($CFG->dirroot . '/backup/util/includes/restore_includes.php');

$admin = get_admin();
$categoryid = ${parseInt(categoryId, 10)};

// Extract backup to temp directory
$tempdir = 'playground_restore_' . time();
$tempdirpath = make_backup_temp_directory($tempdir);
$fb = get_file_packer('application/vnd.moodle.backup');
$result = $fb->extract_to_pathname('${escapePhp(tempPath)}', $tempdirpath);

if (!$result) {
    echo json_encode(['ok' => false, 'error' => 'Failed to extract backup archive']);
    exit(0);
}

try {
    $controller = new restore_controller(
        $tempdir,
        $categoryid,
        backup::INTERACTIVE_NO,
        backup::MODE_GENERAL,
        $admin->id,
        backup::TARGET_NEW_COURSE
    );

    if (!$controller->execute_precheck()) {
        $results = $controller->get_precheck_results();
        $errors = isset($results['errors']) ? implode(', ', $results['errors']) : 'Unknown precheck error';
        $controller->destroy();
        echo json_encode(['ok' => false, 'error' => 'Precheck failed: ' . $errors]);
        exit(0);
    }

    $controller->execute_plan();
    $courseid = $controller->get_courseid();
    $controller->destroy();

    echo json_encode(['ok' => true, 'courseid' => $courseid]);
} catch (\\Throwable $e) {
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
}

// Cleanup
@unlink('${escapePhp(tempPath)}');
`;

  await php.run(code);
}
