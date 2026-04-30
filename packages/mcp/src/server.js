import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { TOOL_DEFINITIONS } from "./tools.js";
import { RESOURCE_DEFINITIONS, readResource } from "./resources.js";
import { PROMPT_DEFINITIONS, getPromptMessages } from "./prompts.js";

export function createMcpServer(wsBridge) {
  const server = new Server(
    { name: "moodle-playground", version: "0.1.0" },
    { capabilities: { tools: {}, resources: {}, prompts: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: TOOL_DEFINITIONS };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    const knownTool = TOOL_DEFINITIONS.find((t) => t.name === name);
    if (!knownTool) {
      return {
        content: [{ type: "text", text: `Unknown tool: ${name}` }],
        isError: true,
      };
    }

    try {
      const result = await wsBridge.callTool(name, args || {});
      const text = typeof result === "string" ? result : JSON.stringify(result, null, 2);
      return { content: [{ type: "text", text }] };
    } catch (error) {
      return {
        content: [{ type: "text", text: error.message }],
        isError: true,
      };
    }
  });

  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return { resources: RESOURCE_DEFINITIONS };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;
    const definition = RESOURCE_DEFINITIONS.find((r) => r.uri === uri);
    if (!definition) {
      throw new Error(`Unknown resource: ${uri}`);
    }

    try {
      const text = await readResource(uri, wsBridge);
      return {
        contents: [
          {
            uri,
            mimeType: definition.mimeType,
            text,
          },
        ],
      };
    } catch (error) {
      return {
        contents: [
          {
            uri,
            mimeType: "text/plain",
            text: `Error reading resource: ${error.message}`,
          },
        ],
      };
    }
  });

  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    return { prompts: PROMPT_DEFINITIONS };
  });

  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const definition = PROMPT_DEFINITIONS.find((p) => p.name === name);
    if (!definition) {
      throw new Error(`Unknown prompt: ${name}`);
    }

    const messages = getPromptMessages(name, args || {});
    return { messages };
  });

  return server;
}

export async function runServer(wsBridge) {
  const server = createMcpServer(wsBridge);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  return server;
}
