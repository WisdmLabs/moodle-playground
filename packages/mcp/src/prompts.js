export const PROMPT_DEFINITIONS = [
  {
    name: "create-course",
    description: "Create a Moodle course with sensible defaults",
    arguments: [
      { name: "fullname", description: "Course full name", required: true },
      { name: "shortname", description: "Course short name", required: true },
      { name: "format", description: "Course format (topics, weeks, social)", required: false },
      { name: "numsections", description: "Number of sections", required: false },
    ],
  },
  {
    name: "install-plugin",
    description: "Install a Moodle plugin from a GitHub repository",
    arguments: [
      { name: "url", description: "GitHub repository URL or ZIP URL", required: true },
    ],
  },
  {
    name: "debug-error",
    description: "Enable debug mode and investigate an error in Moodle",
    arguments: [
      { name: "error", description: "Error message or description", required: false },
    ],
  },
  {
    name: "export-and-share",
    description: "Export the current site state for sharing or backup",
    arguments: [],
  },
  {
    name: "setup-test-environment",
    description: "Set up a test environment with users, courses, and enrollments",
    arguments: [
      { name: "courses", description: "Number of courses to create", required: false },
      { name: "users", description: "Number of users to create", required: false },
    ],
  },
];

export function getPromptMessages(name, args = {}) {
  switch (name) {
    case "create-course":
      return [
        {
          role: "user",
          content: {
            type: "text",
            text: `Create a Moodle course with the following details:
- Full name: ${args.fullname || "New Course"}
- Short name: ${args.shortname || "COURSE101"}
- Format: ${args.format || "topics"}
- Number of sections: ${args.numsections || "5"}

Use the moodle/runPhp tool to create the course via Moodle's API:

\`\`\`php
<?php
define('CLI_SCRIPT', true);
require('/www/moodle/config.php');
require_once($CFG->dirroot . '/course/lib.php');

$course = new stdClass();
$course->fullname = '${args.fullname || "New Course"}';
$course->shortname = '${args.shortname || "COURSE101"}';
$course->category = 1;
$course->format = '${args.format || "topics"}';
$course->numsections = ${args.numsections || "5"};
$course->visible = 1;
$course->summary = '';

$created = create_course($course);
echo json_encode(['id' => $created->id, 'shortname' => $created->shortname]);
\`\`\`

After creating the course, navigate to it with moodle/navigate to verify.`,
          },
        },
      ];

    case "install-plugin":
      return [
        {
          role: "user",
          content: {
            type: "text",
            text: `Install a Moodle plugin from: ${args.url || "[GitHub URL needed]"}

Steps:
1. Use moodle/installPlugin with the ZIP URL
2. Navigate to /admin/index.php to complete the upgrade
3. Verify the plugin is installed with moodle/runPhp to check core_plugin_manager

If the URL is a GitHub repository URL (not a ZIP), convert it:
- https://github.com/user/repo → https://github.com/user/repo/archive/refs/heads/main.zip

The plugin type and name are auto-detected from version.php inside the ZIP.`,
          },
        },
      ];

    case "debug-error":
      return [
        {
          role: "user",
          content: {
            type: "text",
            text: `Debug a Moodle error${args.error ? `: "${args.error}"` : ""}.

Steps:
1. Enable developer debug mode:
   - moodle/setConfig { name: "debug", value: "32767" }
   - moodle/setConfig { name: "debugdisplay", value: "1" }

2. Check recent logs:
   - Use moodle/runPhp to query logstore_standard_log for recent error events

3. Check PHP error output:
   - Navigate to the page that triggers the error
   - Read the response for stack traces or error messages

4. Check config:
   - Use moodle/getSiteInfo to verify versions
   - Use moodle/runPhp to check relevant config values

5. Once diagnosed, disable debug mode:
   - moodle/setConfig { name: "debug", value: "0" }
   - moodle/setConfig { name: "debugdisplay", value: "0" }`,
          },
        },
      ];

    case "export-and-share":
      return [
        {
          role: "user",
          content: {
            type: "text",
            text: `Export the current Moodle Playground state for sharing.

Steps:
1. Use moodle/exportSite to create a ZIP of the current state
2. The ZIP contains the database, moodledata files, and any installed plugins
3. This ZIP can be imported later with moodle/importSite to restore the exact state
4. Use moodle/getSiteInfo to document what's in the export

Note: The playground is ephemeral — exporting is the only way to preserve state across sessions.`,
          },
        },
      ];

    case "setup-test-environment":
      return [
        {
          role: "user",
          content: {
            type: "text",
            text: `Set up a test environment with:
- ${args.courses || "3"} courses
- ${args.users || "5"} users (mix of teachers and students)
- Enrollments connecting users to courses

Use moodle/applyBlueprint with a blueprint like:
\`\`\`json
{
  "steps": [
    { "step": "createUser", "options": { "username": "teacher1", "password": "Teacher1!", "firstname": "Alice", "lastname": "Smith", "email": "teacher1@example.com" } },
    { "step": "createUser", "options": { "username": "student1", "password": "Student1!", "firstname": "Bob", "lastname": "Jones", "email": "student1@example.com" } },
    { "step": "createUser", "options": { "username": "student2", "password": "Student2!", "firstname": "Carol", "lastname": "Davis", "email": "student2@example.com" } },
    { "step": "createCourse", "options": { "fullname": "Introduction to Testing", "shortname": "TEST101" } },
    { "step": "createCourse", "options": { "fullname": "Advanced Testing", "shortname": "TEST201" } },
    { "step": "enrollUser", "options": { "username": "teacher1", "courseShortname": "TEST101", "role": "editingteacher" } },
    { "step": "enrollUser", "options": { "username": "student1", "courseShortname": "TEST101", "role": "student" } },
    { "step": "enrollUser", "options": { "username": "student2", "courseShortname": "TEST101", "role": "student" } },
    { "step": "enrollUser", "options": { "username": "teacher1", "courseShortname": "TEST201", "role": "editingteacher" } },
    { "step": "enrollUser", "options": { "username": "student1", "courseShortname": "TEST201", "role": "student" } }
  ]
}
\`\`\`

Adjust the number of users and courses as needed. After applying, verify with moodle/getSiteInfo.`,
          },
        },
      ];

    default:
      throw new Error(`Unknown prompt: ${name}`);
  }
}
