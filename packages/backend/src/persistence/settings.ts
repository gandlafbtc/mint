import { settingsTable } from "@mnt/common/db";
import { type InsertSetting } from "@mnt/common/db/types";
import { db } from "../db/db";
import { conflictUpdateAllExcept } from "./helper";

export const upsertSettings = async (settings: Omit<InsertSetting, 'uid'>[]) => {
    await db.insert(settingsTable)
        .values(settings)
        .onConflictDoUpdate({ target: settingsTable.key, set: conflictUpdateAllExcept(settingsTable, ['key', 'uid']) });
}