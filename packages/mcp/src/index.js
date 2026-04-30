import { WsBridge } from "./ws-bridge.js";
import { runServer } from "./server.js";

export async function startServer(argv = []) {
  let port = 7999;
  let playgroundUrl = "https://moodle-playground.com";
  let autoOpen = true;

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--port" && argv[i + 1]) {
      port = Number.parseInt(argv[++i], 10);
    } else if (argv[i] === "--playground-url" && argv[i + 1]) {
      playgroundUrl = argv[++i];
    } else if (argv[i] === "--no-open") {
      autoOpen = false;
    } else if (argv[i] === "--help" || argv[i] === "-h") {
      process.stderr.write(
        `Usage: moodle-playground-mcp [options]

Options:
  --port <number>           WebSocket port (default: 7999)
  --playground-url <url>    Playground URL (default: https://moodle-playground.com)
  --no-open                 Don't auto-open the browser
  --help, -h                Show this help
`,
      );
      process.exit(0);
    }
  }

  const bridge = new WsBridge({ port, playgroundUrl });
  await bridge.start();

  process.stderr.write(`[mcp] Moodle Playground MCP Server v0.1.0\n`);
  process.stderr.write(`[mcp] WebSocket bridge listening on ws://127.0.0.1:${bridge.port}\n`);
  process.stderr.write(`[mcp] Open the playground at:\n`);
  process.stderr.write(`[mcp]   ${bridge.connectionUrl}\n`);

  if (autoOpen) {
    try {
      const { default: open } = await import("open");
      await open(bridge.connectionUrl);
      process.stderr.write(`[mcp] Browser opened automatically\n`);
    } catch {
      process.stderr.write(`[mcp] Could not auto-open browser (install 'open' package or open manually)\n`);
    }
  }

  await runServer(bridge);

  process.on("SIGINT", () => {
    bridge.stop();
    process.exit(0);
  });
}
