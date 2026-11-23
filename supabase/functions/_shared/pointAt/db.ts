/** Minimal database interface the Point At store is written against. */
export interface Db {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  /** Run fn in a transaction. The Db passed to fn must be used for every query inside it. */
  transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

/**
 * `transaction` for a Db that is already inside one: each call runs in a savepoint, so a call that
 * throws undoes only its own writes (and recovers the outer transaction from a failed statement)
 * instead of leaving them half done. Requests run inside one transaction, which sets who is
 * viewing, so store methods that open their own transaction land here.
 */
export function savepointTransaction(getTx: () => Db): Db["transaction"] {
  let depth = 0;
  return async (fn) => {
    depth += 1;
    const name = `point_at_sp_${depth}`;
    const tx = getTx();
    await tx.query(`savepoint ${name}`);
    try {
      const result = await fn(tx);
      await tx.query(`release savepoint ${name}`);
      return result;
    } catch (error: unknown) {
      await tx.query(`rollback to savepoint ${name}`);
      throw error;
    } finally {
      depth -= 1;
    }
  };
}
