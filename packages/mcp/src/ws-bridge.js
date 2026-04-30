import { randomBytes } from "node:crypto";
import { WebSocketServer } from "ws";

const TOOL_CALL_TIMEOUT_MS = 60_000;

export class WsBridge {
  #wss;
  #port;
  #token;
  #client = null;
  #pending = new Map();
  #requestId = 0;
  #playgroundUrl;

  constructor({ port = 7999, playgroundUrl = "https://moodle-playground.com" } = {}) {
    this.#port = port;
    this.#token = randomBytes(16).toString("hex");
    this.#playgroundUrl = playgroundUrl;
  }

  get port() {
    return this.#port;
  }

  get token() {
    return this.#token;
  }

  get connectionUrl() {
    const url = new URL(this.#playgroundUrl);
    url.searchParams.set("mcp-ws", `ws://localhost:${this.#port}?token=${this.#token}`);
    return url.toString();
  }

  get isConnected() {
    return this.#client?.readyState === 1;
  }

  start() {
    return new Promise((resolve) => {
      this.#wss = new WebSocketServer({ port: this.#port, host: "127.0.0.1" });

      this.#wss.on("connection", (ws, req) => {
        const reqUrl = new URL(req.url, `http://localhost:${this.#port}`);
        if (reqUrl.searchParams.get("token") !== this.#token) {
          ws.close(4001, "Invalid token");
          return;
        }

        if (this.#client) {
          this.#client.close(4002, "Replaced by new connection");
        }

        this.#client = ws;
        process.stderr.write("[mcp] Browser connected to WebSocket bridge\n");

        ws.on("message", (data) => {
          try {
            const message = JSON.parse(data.toString());
            if (message.responseId && this.#pending.has(message.responseId)) {
              const { resolve: res, reject: rej, timer } = this.#pending.get(message.responseId);
              clearTimeout(timer);
              this.#pending.delete(message.responseId);
              if (message.error) {
                rej(new Error(message.error));
              } else {
                res(message.result);
              }
            }
          } catch {
            // Ignore malformed messages
          }
        });

        ws.on("close", () => {
          if (this.#client === ws) {
            this.#client = null;
            process.stderr.write("[mcp] Browser disconnected from WebSocket bridge\n");
          }
        });
      });

      this.#wss.on("listening", () => {
        resolve();
      });
    });
  }

  callTool(toolName, args) {
    return new Promise((resolve, reject) => {
      if (!this.#client || this.#client.readyState !== 1) {
        reject(new Error("No browser connected. Open the playground at: " + this.connectionUrl));
        return;
      }

      const requestId = ++this.#requestId;
      const timer = setTimeout(() => {
        this.#pending.delete(requestId);
        reject(new Error(`Tool call ${toolName} timed out after ${TOOL_CALL_TIMEOUT_MS}ms`));
      }, TOOL_CALL_TIMEOUT_MS);

      this.#pending.set(requestId, { resolve, reject, timer });

      this.#client.send(JSON.stringify({
        type: "tool-call",
        requestId,
        toolName,
        arguments: args || {},
      }));
    });
  }

  stop() {
    for (const [, { reject, timer }] of this.#pending) {
      clearTimeout(timer);
      reject(new Error("Bridge shutting down"));
    }
    this.#pending.clear();
    this.#client?.close();
    this.#wss?.close();
  }
}
