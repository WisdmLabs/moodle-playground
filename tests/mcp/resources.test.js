import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { RESOURCE_DEFINITIONS } from "../../packages/mcp/src/resources.js";

describe("MCP Resource Definitions", () => {
  it("should define exactly 7 resources", () => {
    assert.equal(RESOURCE_DEFINITIONS.length, 7);
  });

  it("should have unique URIs", () => {
    const uris = RESOURCE_DEFINITIONS.map((r) => r.uri);
    const uniqueUris = new Set(uris);
    assert.equal(uniqueUris.size, uris.length, "Duplicate resource URIs found");
  });

  it("should have all URIs prefixed with moodle://", () => {
    for (const resource of RESOURCE_DEFINITIONS) {
      assert.ok(
        resource.uri.startsWith("moodle://"),
        `Resource ${resource.uri} should start with moodle://`,
      );
    }
  });

  it("should have name and description for every resource", () => {
    for (const resource of RESOURCE_DEFINITIONS) {
      assert.ok(resource.name, `Resource ${resource.uri} missing name`);
      assert.ok(
        resource.description,
        `Resource ${resource.uri} missing description`,
      );
    }
  });

  it("should have mimeType for every resource", () => {
    for (const resource of RESOURCE_DEFINITIONS) {
      assert.ok(resource.mimeType, `Resource ${resource.uri} missing mimeType`);
    }
  });

  it("should include all expected resources", () => {
    const expected = [
      "moodle://site/info",
      "moodle://site/config",
      "moodle://site/courses",
      "moodle://site/users",
      "moodle://site/plugins",
      "moodle://blueprint/current",
      "moodle://logs/recent",
    ];
    const uris = RESOURCE_DEFINITIONS.map((r) => r.uri);
    for (const uri of expected) {
      assert.ok(uris.includes(uri), `Missing resource: ${uri}`);
    }
  });

  it("should use application/json mimeType for all resources", () => {
    for (const resource of RESOURCE_DEFINITIONS) {
      assert.equal(
        resource.mimeType,
        "application/json",
        `Resource ${resource.uri} should use application/json`,
      );
    }
  });
});
