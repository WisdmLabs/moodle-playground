import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { TOOL_DEFINITIONS } from "../../packages/mcp/src/tools.js";

describe("MCP Tool Definitions", () => {
  it("should define exactly 21 tools", () => {
    assert.equal(TOOL_DEFINITIONS.length, 21);
  });

  it("should have unique tool names", () => {
    const names = TOOL_DEFINITIONS.map((t) => t.name);
    const uniqueNames = new Set(names);
    assert.equal(uniqueNames.size, names.length, "Duplicate tool names found");
  });

  it("should have all names prefixed with moodle/", () => {
    for (const tool of TOOL_DEFINITIONS) {
      assert.ok(
        tool.name.startsWith("moodle/"),
        `Tool ${tool.name} should start with moodle/`,
      );
    }
  });

  it("should have description for every tool", () => {
    for (const tool of TOOL_DEFINITIONS) {
      assert.ok(
        tool.description && tool.description.length > 0,
        `Tool ${tool.name} missing description`,
      );
    }
  });

  it("should have inputSchema for every tool", () => {
    for (const tool of TOOL_DEFINITIONS) {
      assert.ok(
        tool.inputSchema,
        `Tool ${tool.name} missing inputSchema`,
      );
      assert.equal(
        tool.inputSchema.type,
        "object",
        `Tool ${tool.name} inputSchema type should be object`,
      );
    }
  });

  it("should include all expected tools", () => {
    const expected = [
      "moodle/navigate",
      "moodle/runPhp",
      "moodle/readFile",
      "moodle/writeFile",
      "moodle/listFiles",
      "moodle/exportSite",
      "moodle/importSite",
      "moodle/getWebsiteUrl",
      "moodle/getSiteInfo",
      "moodle/getCurrentUrl",
      "moodle/resetSite",
      "moodle/saveSite",
      "moodle/mkdir",
      "moodle/deleteFile",
      "moodle/deleteDirectory",
      "moodle/fileExists",
      "moodle/applyBlueprint",
      "moodle/getBlueprint",
      "moodle/setConfig",
      "moodle/installPlugin",
      "moodle/listSites",
    ];
    const names = TOOL_DEFINITIONS.map((t) => t.name);
    for (const name of expected) {
      assert.ok(names.includes(name), `Missing tool: ${name}`);
    }
  });

  it("should require path for navigate", () => {
    const tool = TOOL_DEFINITIONS.find((t) => t.name === "moodle/navigate");
    assert.deepEqual(tool.inputSchema.required, ["path"]);
  });

  it("should require code for runPhp", () => {
    const tool = TOOL_DEFINITIONS.find((t) => t.name === "moodle/runPhp");
    assert.deepEqual(tool.inputSchema.required, ["code"]);
  });

  it("should require path and data for writeFile", () => {
    const tool = TOOL_DEFINITIONS.find((t) => t.name === "moodle/writeFile");
    assert.deepEqual(tool.inputSchema.required, ["path", "data"]);
  });

  it("should require url for installPlugin", () => {
    const tool = TOOL_DEFINITIONS.find((t) => t.name === "moodle/installPlugin");
    assert.deepEqual(tool.inputSchema.required, ["url"]);
  });

  it("should require name and value for setConfig", () => {
    const tool = TOOL_DEFINITIONS.find((t) => t.name === "moodle/setConfig");
    assert.deepEqual(tool.inputSchema.required, ["name", "value"]);
  });

  it("should require blueprint for applyBlueprint", () => {
    const tool = TOOL_DEFINITIONS.find((t) => t.name === "moodle/applyBlueprint");
    assert.deepEqual(tool.inputSchema.required, ["blueprint"]);
  });

  it("should have no required params for parameterless tools", () => {
    const noParams = [
      "moodle/exportSite",
      "moodle/getWebsiteUrl",
      "moodle/getSiteInfo",
      "moodle/getCurrentUrl",
      "moodle/resetSite",
      "moodle/saveSite",
      "moodle/getBlueprint",
      "moodle/listSites",
    ];
    for (const name of noParams) {
      const tool = TOOL_DEFINITIONS.find((t) => t.name === name);
      assert.ok(
        !tool.inputSchema.required || tool.inputSchema.required.length === 0,
        `Tool ${name} should have no required params`,
      );
    }
  });
});
