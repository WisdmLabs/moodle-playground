# Blueprint Format Reference

Blueprints are JSON documents that declaratively configure a Moodle Playground instance.

## Structure

```json
{
  "moodleVersion": "5.0",
  "phpVersion": "8.3",
  "landingPage": "/course/view.php?id=2",
  "constants": {
    "COURSE_NAME": "Demo Course"
  },
  "resources": {
    "readme": { "type": "literal", "contents": "Hello World" }
  },
  "runtime": {
    "debug": 0,
    "debugdisplay": 0
  },
  "steps": [
    { "step": "installMoodle", "options": {} }
  ]
}
```

## Top-Level Fields

| Field | Type | Description |
|-------|------|-------------|
| `moodleVersion` | string | Moodle version (`4.4`, `4.5`, `5.0`, `5.1`, `5.2`, `dev`) |
| `phpVersion` | string | PHP version (`8.1`–`8.5`) |
| `landingPage` | string | URL path to navigate to after setup |
| `constants` | object | Key-value pairs for `{{KEY}}` substitution in step options |
| `resources` | object | Named resources referenced by steps via `@name` |
| `runtime` | object | Runtime config: `debug` (0/5/15/32767), `debugdisplay` (0/1) |
| `steps` | array | Ordered list of provisioning steps |

## Step Catalog

### Site Setup

| Step | Options | Description |
|------|---------|-------------|
| `installMoodle` | `adminPassword`, `adminEmail`, `siteName` | Marks Moodle for installation (declarative) |
| `setSiteConfig` | `name`, `value` | Set a core Moodle config value |
| `setPluginConfig` | `plugin`, `name`, `value` | Set a plugin-scoped config value |
| `enablePlugin` | `plugin`, `type` | Enable a plugin |
| `disablePlugin` | `plugin`, `type` | Disable a plugin |

### Users

| Step | Options | Description |
|------|---------|-------------|
| `createUser` | `username`, `password`, `email`, `firstname`, `lastname` | Create a user account |
| `deleteUser` | `username` | Delete a user |

### Courses

| Step | Options | Description |
|------|---------|-------------|
| `createCourse` | `fullname`, `shortname`, `category`, `format`, `numsections` | Create a course |
| `deleteCourse` | `shortname` | Delete a course |
| `createCategory` | `name`, `description`, `parent` | Create a course category |

### Enrollment

| Step | Options | Description |
|------|---------|-------------|
| `enrollUser` | `username`, `courseShortname`, `role` | Enroll user in a course |
| `unenrollUser` | `username`, `courseShortname` | Remove enrollment |

### Content

| Step | Options | Description |
|------|---------|-------------|
| `addCourseModule` | `courseShortname`, `section`, `type`, `name`, `intro`, `options` | Add an activity/resource |
| `addBlock` | `courseShortname`, `blockName`, `region`, `weight` | Add a block to a course |

### Plugins

| Step | Options | Description |
|------|---------|-------------|
| `installPlugin` | `url`, `pluginType`, `pluginName` | Install from GitHub ZIP URL |
| `uploadPlugin` | `resource`, `pluginType`, `pluginName` | Install from resource |

### Files

| Step | Options | Description |
|------|---------|-------------|
| `writeFile` | `path`, `data` | Write a file to MEMFS |
| `writeFiles` | `files` (array of `{path, data}`) | Write multiple files |
| `mkdir` | `path` | Create a directory |

### Navigation

| Step | Options | Description |
|------|---------|-------------|
| `login` | `username`, `password` | Log in as a user |
| `navigate` | `path` | Navigate to a URL |

### PHP

| Step | Options | Description |
|------|---------|-------------|
| `runPhp` | `code` | Execute arbitrary PHP code |
| `runSql` | `sql` | Execute SQL via Moodle's DB API |

### Theme

| Step | Options | Description |
|------|---------|-------------|
| `setTheme` | `theme` | Set the active theme |

### Advanced

| Step | Options | Description |
|------|---------|-------------|
| `importSite` | `url` or `resource` | Import a site ZIP |
| `importDatabase` | `url` or `resource` | Import a database file |
| `purgeCache` | — | Purge all Moodle caches |
| `cron` | `task` (optional) | Run cron or a specific task |

## Constants

Use `{{CONSTANT_NAME}}` in any step option value. Constants are defined at the top level and substituted before step execution.

```json
{
  "constants": { "TEACHER": "jane.doe" },
  "steps": [
    { "step": "createUser", "options": { "username": "{{TEACHER}}" } },
    { "step": "enrollUser", "options": { "username": "{{TEACHER}}", "role": "editingteacher" } }
  ]
}
```

## Resources

Named data blobs referenced by steps via `@resourceName`.

```json
{
  "resources": {
    "pluginZip": { "type": "url", "url": "https://github.com/user/repo/archive/main.zip" },
    "configFile": { "type": "literal", "contents": "<?php // config" }
  },
  "steps": [
    { "step": "uploadPlugin", "options": { "resource": "@pluginZip" } },
    { "step": "writeFile", "options": { "path": "/www/moodle/local/custom/config.php", "data": "@configFile" } }
  ]
}
```

Resource types: `literal` (inline string), `base64` (encoded data), `url` (fetch at runtime).
