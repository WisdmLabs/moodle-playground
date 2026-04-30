export const TOOL_DEFINITIONS = [
  {
    name: "moodle/navigate",
    description: "Navigate to a Moodle URL path",
    inputSchema: {
      type: "object",
      properties: { path: { type: "string", description: "URL path (e.g. /course/view.php?id=2)" } },
      required: ["path"],
    },
  },
  {
    name: "moodle/runPhp",
    description: "Execute PHP code in the Moodle runtime and return the output",
    inputSchema: {
      type: "object",
      properties: { code: { type: "string", description: "PHP code including <?php tag" } },
      required: ["code"],
    },
  },
  {
    name: "moodle/readFile",
    description: "Read a file from the Moodle MEMFS filesystem",
    inputSchema: {
      type: "object",
      properties: { path: { type: "string", description: "Absolute file path in MEMFS" } },
      required: ["path"],
    },
  },
  {
    name: "moodle/writeFile",
    description: "Write a file to the Moodle MEMFS filesystem",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Absolute file path in MEMFS" },
        data: { type: "string", description: "File content as a string" },
      },
      required: ["path", "data"],
    },
  },
  {
    name: "moodle/listFiles",
    description: "List files in a MEMFS directory",
    inputSchema: {
      type: "object",
      properties: { dir: { type: "string", description: "Directory path" } },
      required: ["dir"],
    },
  },
  {
    name: "moodle/exportSite",
    description: "Export the full playground state as a ZIP (database, files, plugins)",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "moodle/importSite",
    description: "Import a ZIP to restore playground state",
    inputSchema: {
      type: "object",
      properties: {
        data: { type: "array", items: { type: "number" }, description: "ZIP data as array of bytes" },
      },
      required: ["data"],
    },
  },
  {
    name: "moodle/getWebsiteUrl",
    description: "Get the current playground website URL",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "moodle/getSiteInfo",
    description: "Get Moodle site information (version, name, PHP version, admin user)",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "moodle/getCurrentUrl",
    description: "Get the current page path within Moodle",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "moodle/resetSite",
    description: "Reset the playground to a fresh install state",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "moodle/saveSite",
    description: "Save the current site state (alias for exportSite)",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "moodle/mkdir",
    description: "Create a directory in MEMFS",
    inputSchema: {
      type: "object",
      properties: { path: { type: "string", description: "Directory path to create" } },
      required: ["path"],
    },
  },
  {
    name: "moodle/deleteFile",
    description: "Delete a file from MEMFS",
    inputSchema: {
      type: "object",
      properties: { path: { type: "string", description: "File path to delete" } },
      required: ["path"],
    },
  },
  {
    name: "moodle/deleteDirectory",
    description: "Delete a directory from MEMFS",
    inputSchema: {
      type: "object",
      properties: { path: { type: "string", description: "Directory path to delete" } },
      required: ["path"],
    },
  },
  {
    name: "moodle/fileExists",
    description: "Check if a file or directory exists in MEMFS",
    inputSchema: {
      type: "object",
      properties: { path: { type: "string", description: "Path to check" } },
      required: ["path"],
    },
  },
  {
    name: "moodle/applyBlueprint",
    description: "Apply a blueprint JSON to the running playground instance",
    inputSchema: {
      type: "object",
      properties: { blueprint: { type: "object", description: "Blueprint JSON object" } },
      required: ["blueprint"],
    },
  },
  {
    name: "moodle/getBlueprint",
    description: "Get the currently active blueprint",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "moodle/setConfig",
    description: "Set a Moodle configuration value",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Config setting name" },
        value: { type: "string", description: "Config value" },
        plugin: { type: "string", description: "Plugin name (optional, for plugin-scoped settings)" },
      },
      required: ["name", "value"],
    },
  },
  {
    name: "moodle/installPlugin",
    description: "Install a Moodle plugin from a ZIP URL",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "GitHub archive ZIP URL" },
        pluginType: { type: "string", description: "Plugin type (auto-detected from URL if omitted)" },
        pluginName: { type: "string", description: "Plugin name (auto-detected from URL if omitted)" },
      },
      required: ["url"],
    },
  },
  {
    name: "moodle/listSites",
    description: "List active playground instances",
    inputSchema: { type: "object", properties: {} },
  },
];
