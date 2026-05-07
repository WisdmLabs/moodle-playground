/**
 * MCP (Model Context Protocol) bridge for Moodle Playground.
 *
 * Supports 21 tools for AI agent control via postMessage (IDE extensions,
 * client library) and WebSocket (standalone MCP server).
 */

const MCP_VERSION = "2024-11-05";

export class McpBridge {
  #iframe;
  #handlers;

  constructor(iframe) {
    this.#iframe = iframe;
    this.#handlers = new Map();
    this.#registerDefaultTools();
  }

  #registerDefaultTools() {
    this.#handlers.set("moodle/navigate", async (params) => {
      return this.#sendToPlayground("navigate", { path: params.path });
    });

    this.#handlers.set("moodle/runPhp", async (params) => {
      return this.#sendToPlayground("run-php", { code: params.code });
    });

    this.#handlers.set("moodle/readFile", async (params) => {
      return this.#sendToPlayground("read-file", { path: params.path });
    });

    this.#handlers.set("moodle/writeFile", async (params) => {
      return this.#sendToPlayground("write-file", {
        path: params.path,
        data: params.data,
      });
    });

    this.#handlers.set("moodle/listFiles", async (params) => {
      return this.#sendToPlayground("list-files", { dir: params.dir });
    });

    this.#handlers.set("moodle/exportSite", async () => {
      return this.#sendToPlayground("export-site");
    });

    this.#handlers.set("moodle/importSite", async (params) => {
      return this.#sendToPlayground("import-site", { data: params.data });
    });

    this.#handlers.set("moodle/getWebsiteUrl", async () => {
      return this.#sendToPlayground("get-website-url");
    });

    this.#handlers.set("moodle/getSiteInfo", async () => {
      return this.#sendToPlayground("get-site-info");
    });

    this.#handlers.set("moodle/getCurrentUrl", async () => {
      return this.#sendToPlayground("get-current-url");
    });

    this.#handlers.set("moodle/resetSite", async () => {
      return this.#sendToPlayground("reset-site");
    });

    this.#handlers.set("moodle/saveSite", async () => {
      return this.#sendToPlayground("export-site");
    });

    this.#handlers.set("moodle/mkdir", async (params) => {
      return this.#sendToPlayground("mkdir", { path: params.path });
    });

    this.#handlers.set("moodle/deleteFile", async (params) => {
      return this.#sendToPlayground("delete-file", { path: params.path });
    });

    this.#handlers.set("moodle/deleteDirectory", async (params) => {
      return this.#sendToPlayground("delete-directory", { path: params.path });
    });

    this.#handlers.set("moodle/fileExists", async (params) => {
      return this.#sendToPlayground("file-exists", { path: params.path });
    });

    this.#handlers.set("moodle/applyBlueprint", async (params) => {
      return this.#sendToPlayground("apply-blueprint", {
        blueprint: params.blueprint,
      });
    });

    this.#handlers.set("moodle/getBlueprint", async () => {
      return this.#sendToPlayground("get-blueprint");
    });

    this.#handlers.set("moodle/setConfig", async (params) => {
      return this.#sendToPlayground("set-config", {
        name: params.name,
        value: params.value,
        plugin: params.plugin,
      });
    });

    this.#handlers.set("moodle/installPlugin", async (params) => {
      return this.#sendToPlayground("install-plugin", {
        url: params.url,
        pluginType: params.pluginType,
        pluginName: params.pluginName,
      });
    });

    this.#handlers.set("moodle/listSites", async () => {
      return this.#sendToPlayground("list-sites");
    });
  }

  #sendToPlayground(type, payload = {}) {
    return new Promise((resolve, reject) => {
      const id = Date.now() + Math.random();

      function handler(event) {
        if (event.data?.source !== "moodle-playground-host") return;
        if (event.data?.id !== id) return;
        window.removeEventListener("message", handler);
        if (event.data.error) {
          reject(new Error(event.data.error));
        } else {
          resolve(event.data.result);
        }
      }

      window.addEventListener("message", handler);
      this.#iframe.contentWindow.postMessage(
        { source: "moodle-playground-client", type, id, ...payload },
        "*",
      );

      setTimeout(() => {
        window.removeEventListener("message", handler);
        reject(new Error(`MCP request ${type} timed out`));
      }, 60000);
    });
  }

  getServerInfo() {
    return {
      name: "moodle-playground",
      version: "0.1.0",
      protocolVersion: MCP_VERSION,
    };
  }

  getToolList() {
    return [
      {
        name: "moodle/navigate",
        description: "Navigate to a Moodle URL path",
        inputSchema: {
          type: "object",
          properties: { path: { type: "string", description: "URL path" } },
          required: ["path"],
        },
      },
      {
        name: "moodle/runPhp",
        description: "Execute PHP code in the Moodle runtime",
        inputSchema: {
          type: "object",
          properties: { code: { type: "string", description: "PHP code" } },
          required: ["code"],
        },
      },
      {
        name: "moodle/readFile",
        description: "Read a file from the Moodle filesystem",
        inputSchema: {
          type: "object",
          properties: { path: { type: "string", description: "File path" } },
          required: ["path"],
        },
      },
      {
        name: "moodle/writeFile",
        description: "Write a file to the Moodle filesystem",
        inputSchema: {
          type: "object",
          properties: {
            path: { type: "string", description: "File path" },
            data: { type: "string", description: "File content" },
          },
          required: ["path", "data"],
        },
      },
      {
        name: "moodle/listFiles",
        description: "List files in a Moodle filesystem directory",
        inputSchema: {
          type: "object",
          properties: {
            dir: { type: "string", description: "Directory path" },
          },
          required: ["dir"],
        },
      },
      {
        name: "moodle/exportSite",
        description: "Export the playground state as a ZIP",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "moodle/importSite",
        description: "Import a ZIP to restore playground state",
        inputSchema: {
          type: "object",
          properties: {
            data: { description: "ZIP data as array of bytes" },
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
        description: "Get Moodle site information",
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
          properties: {
            path: { type: "string", description: "Directory path" },
          },
          required: ["path"],
        },
      },
      {
        name: "moodle/deleteFile",
        description: "Delete a file from MEMFS",
        inputSchema: {
          type: "object",
          properties: { path: { type: "string", description: "File path" } },
          required: ["path"],
        },
      },
      {
        name: "moodle/deleteDirectory",
        description: "Delete a directory from MEMFS",
        inputSchema: {
          type: "object",
          properties: {
            path: { type: "string", description: "Directory path" },
          },
          required: ["path"],
        },
      },
      {
        name: "moodle/fileExists",
        description: "Check if a file or directory exists in MEMFS",
        inputSchema: {
          type: "object",
          properties: {
            path: { type: "string", description: "Path to check" },
          },
          required: ["path"],
        },
      },
      {
        name: "moodle/applyBlueprint",
        description: "Apply a blueprint JSON to the running instance",
        inputSchema: {
          type: "object",
          properties: {
            blueprint: { type: "object", description: "Blueprint JSON" },
          },
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
            name: { type: "string", description: "Config name" },
            value: { type: "string", description: "Config value" },
            plugin: { type: "string", description: "Plugin name (optional)" },
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
            pluginType: {
              type: "string",
              description: "Plugin type (auto-detected)",
            },
            pluginName: {
              type: "string",
              description: "Plugin name (auto-detected)",
            },
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
  }

  async handleToolCall(name, params) {
    const handler = this.#handlers.get(name);
    if (!handler) {
      throw new Error(`Unknown tool: ${name}`);
    }
    return handler(params);
  }

  async handleMessage(message) {
    switch (message.method) {
      case "initialize":
        return { serverInfo: this.getServerInfo() };
      case "tools/list":
        return { tools: this.getToolList() };
      case "tools/call":
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                await this.handleToolCall(
                  message.params.name,
                  message.params.arguments || {},
                ),
              ),
            },
          ],
        };
      default:
        throw new Error(`Unknown method: ${message.method}`);
    }
  }
}
