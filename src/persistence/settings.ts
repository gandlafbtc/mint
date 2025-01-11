import { db } from "../db/db";
import { settingsTable, type InsertSetting, type Setting } from "../db/schema";
import { conflictUpdateAllExcept } from "./helper";

export const upsertSettings = async (settings: Omit<InsertSetting, 'uid'>[]) => {
    await db.insert(settingsTable)
        .values(settings)
        .onConflictDoUpdate({ target: settingsTable.key, set: conflictUpdateAllExcept(settingsTable, ['key', 'uid']) });
}