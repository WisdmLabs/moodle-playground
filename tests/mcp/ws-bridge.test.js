import assert from "node:assert/strict";
import { describe, it } from "node:test";

let WsBridge;
let importError;

try {
  const mod = await import("../../packages/mcp/src/ws-bridge.js");
  WsBridge = mod.WsBridge;
} catch (err) {
  importError = err;
}

describe("WsBridge", {
  skip: importError ? "ws package not installed at workspace root" : false,
}, () => {
  it("should generate a 32-character hex token", () => {
    const bridge = new WsBridge({ port: 0 });
    assert.equal(bridge.token.length, 32);
    assert.ok(/^[0-9a-f]{32}$/.test(bridge.token));
  });

  it("should use default port 7999", () => {
    const bridge = new WsBridge();
    assert.equal(bridge.port, 7999);
  });

  it("should accept custom port", () => {
    const bridge = new WsBridge({ port: 8888 });
    assert.equal(bridge.port, 8888);
  });

  it("should build connection URL with token", () => {
    const bridge = new WsBridge({
      port: 7999,
      playgroundUrl: "https://example.com",
    });
    const url = bridge.connectionUrl;
    assert.ok(url.includes("example.com"));
    assert.ok(url.includes("mcp-ws="));
    assert.ok(url.includes(bridge.token));
    assert.ok(url.includes("7999"));
  });

  it("should report not connected initially", () => {
    const bridge = new WsBridge({ port: 0 });
    assert.equal(bridge.isConnected, false);
  });

  it("should reject callTool when not connected", async () => {
    const bridge = new WsBridge({ port: 0 });
    await assert.rejects(
      () => bridge.callTool("moodle/getSiteInfo", {}),
      /No browser connected/,
    );
  });

  it("should generate unique tokens across instances", () => {
    const bridge1 = new WsBridge({ port: 0 });
    const bridge2 = new WsBridge({ port: 0 });
    assert.notEqual(bridge1.token, bridge2.token);
  });

  it("should include ws:// protocol in connection URL", () => {
    const bridge = new WsBridge({
      port: 7999,
      playgroundUrl: "https://example.com",
    });
    const url = bridge.connectionUrl;
    const mcpWs = new URL(url).searchParams.get("mcp-ws");
    assert.ok(mcpWs.startsWith("ws://localhost:"));
  });
});
