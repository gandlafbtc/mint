import type { SQLiteTable, SQLiteTableWithColumns } from "drizzle-orm/sqlite-core";
import { db } from "../db/db";
import { blindedMessagesTable, proofsTable } from "@mnt/common/db";
import { gt } from "drizzle-orm";

export const getAll = async (table: SQLiteTable) => {
    const values = await db.select().from(table)
    return values
}

export const getLastDay = async (table: typeof blindedMessagesTable | typeof proofsTable) => {
    const values = await db.select().from(table).where(gt(table.createdAt, Math.floor(Date.now()/1000)-(60*60*24))).orderBy(table.createdAt)
    return values
}
