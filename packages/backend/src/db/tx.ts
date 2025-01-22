import { sql } from "drizzle-orm";
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";

export type Transaction = {
    readonly db: BunSQLiteDatabase; // This type is the return type of `drizzle`
    readonly nestedIndex: number;
    readonly savepointName: string;
    transaction: <T>(tx: (t: Transaction) => Promise<T>) => Promise<T>;
    rollback: () => void;
};

export function createTransaction(
    db: BunSQLiteDatabase,
    nestedIndex?: number,
    savepointName?: string,
): Transaction {
    const idx = nestedIndex ?? 0;
    const name = savepointName ?? "sp0";

    return {
        db,
        nestedIndex: idx,
        savepointName: name,
        transaction: async (tx) => {
            db.run(sql.raw(`savepoint ${name}`));
            const t = createTransaction(db, idx + 1, `sp${idx + 1}`);

            try {
                const txResult = await tx(t);
                db.run(sql.raw(`release savepoint ${name}`));
                return txResult;
            } catch (e) {
                db.run(sql.raw(`rollback to savepoint ${name}`));
                throw e;
            }
        },
        rollback: () => {
            throw new Error("Rollback called. Reverting transaction");
        },
    };
}
