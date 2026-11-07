#!/usr/bin/env node
// Apply delta.sql (or rollback.sql with --rollback) from an import-book.mjs delta dir to a SCRATCH corpus copy.
//   node scripts/shamela/apply-delta.mjs <copy.db> <delta dir> [--rollback]
// The runner (not the SQL) guards the schema change: books.numbering_edition is added only if missing.
// The SQL files carry their own BEGIN/COMMIT and are idempotent: re-running them is a no-op.
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

export function applySqlFile(dbPath, sqlFile) {
  if (/data\/corpus\.db$/.test(dbPath)) throw new Error("refusing: not a scratch copy");
  const db = new DatabaseSync(dbPath);
  if (!db.prepare("PRAGMA table_info(books)").all().some((c) => c.name === "numbering_edition")) {
    db.exec("ALTER TABLE books ADD COLUMN numbering_edition TEXT");
  }
  try {
    db.exec(readFileSync(sqlFile, "utf8"));
  } catch (e) {
    try { db.exec("ROLLBACK"); } catch { /* no open transaction */ }
    throw e;
  } finally {
    db.exec("PRAGMA wal_checkpoint(TRUNCATE)");
    db.close();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [dbPath, dir, mode] = process.argv.slice(2);
  if (!dbPath || !dir) { console.error("usage: apply-delta.mjs <copy.db> <delta dir> [--rollback]"); process.exit(1); }
  applySqlFile(dbPath, `${dir}/${mode === "--rollback" ? "rollback.sql" : "delta.sql"}`);
  console.log(`applied ${mode === "--rollback" ? "rollback.sql" : "delta.sql"} to ${dbPath}`);
}
