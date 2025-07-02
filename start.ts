// start.ts
const isDev = Bun.argv.includes("dev") || Bun.argv.includes("--dev");

// Next.js: use "dev" for development, "start" for production
const nextCmd = isDev
  ? ["bunx", "next", "dev", "-p", "3000"]
  : ["bunx", "next", "start", "-p", "3000"];
const wsCmd = isDev ? ["bun", "server.ts", "--dev"] : ["bun", "server.ts"];

const next = Bun.spawn(nextCmd, {
  stdout: "inherit",
  stderr: "inherit",
});

const ws = Bun.spawn(wsCmd, {
  stdout: "inherit",
  stderr: "inherit",
});

await Promise.all([next.exited, ws.exited]);