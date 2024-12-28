import type { SQLiteTable, SQLiteTableWithColumns } from "drizzle-orm/sqlite-core";
import { db } from "../db/db";

export const getAll = async (table: SQLiteTable) => {
    const values = await db.select().from(table)
    return values
}