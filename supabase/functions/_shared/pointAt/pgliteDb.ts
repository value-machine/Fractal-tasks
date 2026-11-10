/**
 * Test-only Db: an in-process Postgres (PGlite) built from the Point At migrations, so the
 * store's rules can be tested without touching the shared Supabase project. Never imported by
 * the Edge Function; Vitest runs it under Node.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { PGlite, type Transaction } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite/vector";

import type { Db } from "./db.ts";

const MIGRATIONS_DIR = join(import.meta.dirname, "../../../migrations");
/** Only the Point At migrations: the others need Supabase's auth schema. */
const POINT_AT_MIGRATION = /_point_at_.*\.sql$/;

type Runner = Pick<PGlite | Transaction, "query">;

function wrap(runner: Runner, transaction: Db["transaction"], close: Db["close"]): Db {
  return {
    async query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
      return (await runner.query<T>(sql, params)).rows;
    },
    transaction,
    close,
  };
}

/** A fresh database holding the Point At schema, plus a way to empty it between tests. */
export async function createMigratedPglite(): Promise<{ db: Db; reset: () => Promise<void> }> {
  const pg = await PGlite.create({ extensions: { vector } });
  // Objects Supabase provides that the migrations reference.
  await pg.exec(
    "create schema if not exists extensions; create role anon; create role authenticated;" +
      // Stand-in for Supabase Auth's user table, which contributor tables reference.
      " create schema if not exists auth; create table if not exists auth.users (id uuid primary key);"
  );
  for (const file of readdirSync(MIGRATIONS_DIR).sort()) {
    if (POINT_AT_MIGRATION.test(file)) {
      await pg.exec(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
    }
  }
  const db: Db = wrap(
    pg,
    <T>(fn: (tx: Db) => Promise<T>) =>
      pg.transaction(async (t) => {
        const tx: Db = wrap(
          t,
          (f) => f(tx),
          async () => {}
        );
        return await fn(tx);
      }) as Promise<T>,
    () => pg.close()
  );
  const reset = async () => {
    await pg.exec(
      "truncate agent_tokens, contributors, node_splits, node_dependencies, node_links, node_events, nodes restart identity cascade"
    );
  };
  return { db, reset };
}
