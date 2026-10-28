import { spawn } from "node:child_process";
import { once } from "node:events";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const server = spawn(
  process.execPath,
  [
    resolve("node_modules/next/dist/bin/next"),
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3100",
  ],
  { stdio: "ignore", windowsHide: true },
);

try {
  let ready = false;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (server.exitCode !== null) throw new Error("E2E server exited early");
    try {
      const response = await fetch("http://127.0.0.1:3100/");
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {
      // The server may still be starting.
    }
    await delay(1000);
  }
  if (!ready) throw new Error("E2E server did not become ready");

  const test = spawn(
    process.execPath,
    [
      resolve("node_modules/@playwright/test/cli.js"),
      "test",
      ...process.argv.slice(2),
    ],
    {
      stdio: "inherit",
      windowsHide: true,
      env: {
        ...process.env,
        PLAYWRIGHT_BROWSERS_PATH: resolve(".playwright-browsers"),
        IITI_CONNECT_E2E_EXTERNAL_SERVER: "1",
      },
    },
  );
  const [code] = await once(test, "exit");
  process.exitCode = code ?? 1;
} finally {
  server.kill();
  if (server.exitCode === null) await once(server, "exit");
}
