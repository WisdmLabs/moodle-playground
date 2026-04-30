import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PROMPT_DEFINITIONS,
  getPromptMessages,
} from "../../packages/mcp/src/prompts.js";

describe("MCP Prompt Definitions", () => {
  it("should define exactly 5 prompts", () => {
    assert.equal(PROMPT_DEFINITIONS.length, 5);
  });

  it("should have unique prompt names", () => {
    const names = PROMPT_DEFINITIONS.map((p) => p.name);
    const uniqueNames = new Set(names);
    assert.equal(uniqueNames.size, names.length, "Duplicate prompt names found");
  });

  it("should have description for every prompt", () => {
    for (const prompt of PROMPT_DEFINITIONS) {
      assert.ok(prompt.description, `Prompt ${prompt.name} missing description`);
    }
  });

  it("should have arguments array for every prompt", () => {
    for (const prompt of PROMPT_DEFINITIONS) {
      assert.ok(
        Array.isArray(prompt.arguments),
        `Prompt ${prompt.name} should have arguments array`,
      );
    }
  });

  it("should include all expected prompts", () => {
    const expected = [
      "create-course",
      "install-plugin",
      "debug-error",
      "export-and-share",
      "setup-test-environment",
    ];
    const names = PROMPT_DEFINITIONS.map((p) => p.name);
    for (const name of expected) {
      assert.ok(names.includes(name), `Missing prompt: ${name}`);
    }
  });

  it("create-course should require fullname and shortname", () => {
    const prompt = PROMPT_DEFINITIONS.find((p) => p.name === "create-course");
    const required = prompt.arguments.filter((a) => a.required).map((a) => a.name);
    assert.ok(required.includes("fullname"));
    assert.ok(required.includes("shortname"));
  });

  it("install-plugin should require url", () => {
    const prompt = PROMPT_DEFINITIONS.find((p) => p.name === "install-plugin");
    const required = prompt.arguments.filter((a) => a.required).map((a) => a.name);
    assert.ok(required.includes("url"));
  });
});

describe("getPromptMessages", () => {
  it("should return messages for create-course", () => {
    const messages = getPromptMessages("create-course", {
      fullname: "Test Course",
      shortname: "TC101",
    });
    assert.ok(Array.isArray(messages));
    assert.ok(messages.length > 0);
    assert.equal(messages[0].role, "user");
    assert.ok(messages[0].content.text.includes("Test Course"));
    assert.ok(messages[0].content.text.includes("TC101"));
  });

  it("should return messages for install-plugin with URL", () => {
    const messages = getPromptMessages("install-plugin", {
      url: "https://github.com/example/repo/archive/main.zip",
    });
    assert.ok(messages.length > 0);
    assert.ok(messages[0].content.text.includes("example/repo"));
  });

  it("should return messages for debug-error", () => {
    const messages = getPromptMessages("debug-error", {
      error: "Table not found",
    });
    assert.ok(messages.length > 0);
    assert.ok(messages[0].content.text.includes("Table not found"));
  });

  it("should return messages for export-and-share", () => {
    const messages = getPromptMessages("export-and-share");
    assert.ok(messages.length > 0);
    assert.equal(messages[0].role, "user");
  });

  it("should return messages for setup-test-environment", () => {
    const messages = getPromptMessages("setup-test-environment", {
      courses: "2",
      users: "3",
    });
    assert.ok(messages.length > 0);
    assert.ok(messages[0].content.text.includes("2"));
    assert.ok(messages[0].content.text.includes("3"));
  });

  it("should use defaults when no args provided", () => {
    const messages = getPromptMessages("create-course", {});
    assert.ok(messages[0].content.text.includes("New Course"));
    assert.ok(messages[0].content.text.includes("COURSE101"));
  });

  it("should throw for unknown prompt", () => {
    assert.throws(
      () => getPromptMessages("nonexistent"),
      /Unknown prompt/,
    );
  });
});
