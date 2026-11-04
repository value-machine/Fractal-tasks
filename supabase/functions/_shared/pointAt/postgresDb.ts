import postgres from "npm:postgres@3";

import type { Db } from "./db.ts";

/** Anything postgres.js can run a raw statement on: the pool or a transaction handle. */
interface RawRunner {
  unsafe(query: string, params?: never[]): PromiseLike<unknown>;
}

function wrap(runner: RawRunner, onTransaction: Db["transaction"], onClose: Db["close"]): Db {
  return {
    async query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
      return (await runner.unsafe(sql, params as never[])) as T[];
    },
    transaction: onTransaction,
    close: onClose,
  };
}

/**
 * Connect to Postgres with a server-side connection string (Edge Functions get SUPABASE_DB_URL
 * automatically). Statements stay unprepared so the same code works behind a transaction pooler.
 */
export function connectPostgres(url: string): Db {
  const sql = postgres(url, { max: 3, prepare: false, idle_timeout: 20, connect_timeout: 10 });
  return wrap(
    sql as unknown as RawRunner,
    <T>(fn: (tx: Db) => Promise<T>) =>
      sql.begin(async (t) => {
        const tx: Db = wrap(
          t as unknown as RawRunner,
          (f) => f(tx),
          async () => {}
        );
        return await fn(tx);
      }) as Promise<T>,
    () => sql.end()
  );
}
