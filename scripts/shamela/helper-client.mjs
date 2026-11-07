// Read-only client for the Maktabah Shamela Java helper (same JSON-lines protocol the shamela MCP uses).
// Page/title text lives in Lucene indexes, not in the per-book sqlite files, so this is the only way to read it.
import { spawn } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";

export const SHAMELA_ROOT = process.env.SHAMELA_INSTALL_ROOT || join(homedir(), "Library/Application Support/Shamela");
const HELPER_JAR = process.env.SHAMELA_HELPER_JAR || join(homedir(), ".local/share/shamela-mcp/helper/shamela-helper.jar");

function findJre() {
  if (process.env.SHAMELA_JRE) return join(process.env.SHAMELA_JRE, "bin/java");
  for (const v of ["2", "1"]) {
    const p = join(SHAMELA_ROOT, "app/mac/arm64/jre", v, "bin/java");
    if (existsSync(p)) return p;
  }
  throw new Error("Shamela JRE not found (set SHAMELA_JRE)");
}

export function startHelper() {
  const jars = [];
  for (const v of ["2", "1"]) {
    const dir = join(SHAMELA_ROOT, "app/lucene", v);
    if (existsSync(dir)) {
      jars.push(...readdirSync(dir).filter((n) => n.endsWith(".jar")).sort().map((n) => join(dir, n)));
      break;
    }
  }
  if (!jars.length) throw new Error("Shamela lucene jars not found");
  const child = spawn(findJre(), [
    "--enable-native-access=ALL-UNNAMED", "--add-modules=jdk.incubator.vector",
    "-cp", [...jars, HELPER_JAR].join(":"), "ws.shamela.mcp.Main", SHAMELA_ROOT,
  ], { stdio: ["pipe", "pipe", "ignore"] });
  const pending = new Map();
  let n = 0;
  createInterface({ input: child.stdout }).on("line", (line) => {
    let m;
    try { m = JSON.parse(line); } catch { return; }
    const p = pending.get(m.id);
    if (!p) return;
    pending.delete(m.id);
    if (m.ok) p.resolve(m.data ?? null);
    else p.reject(new Error(m.error?.message ?? "helper error"));
  });
  child.once("exit", () => { for (const p of pending.values()) p.reject(new Error("helper exited")); });
  const request = (cmd, args = {}) => new Promise((resolve, reject) => {
    const id = `r${++n}`;
    pending.set(id, { resolve, reject });
    child.stdin.write(JSON.stringify({ id, cmd, args }) + "\n");
  });
  return { request, close: () => { child.stdin.end(); child.kill(); } };
}
