// start.ts
var isDev = Bun.argv.includes("dev") || Bun.argv.includes("--dev");
var nextCmd = isDev ? ["bunx", "next", "dev", "-p", "3000"] : ["bunx", "next", "start", "-p", "3000"];
var wsCmd = isDev ? ["bun", "server.ts", "--dev"] : ["bun", "server.ts"];
var next = Bun.spawn(nextCmd, {
  stdout: "inherit",
  stderr: "inherit"
});
var ws = Bun.spawn(wsCmd, {
  stdout: "inherit",
  stderr: "inherit"
});
await Promise.all([next.exited, ws.exited]);
