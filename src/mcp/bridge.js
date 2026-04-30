/**
 * MCP (Model Context Protocol) bridge for Moodle Playground.
 *
 * MVP implementation: postMessage-based, works when embedded in
 * IDE extensions (VS Code, JetBrains) or controlled via the client library.
 *
 * Full WebSocket-based bridge requires a companion CLI tool (deferred).
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
      }, 30000);
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
