import { db } from "../db/db";
import { settingsTable, type Setting } from "../db/schema";
import { conflictUpdateAllExcept } from "./helper";

export const upsertSettings = async (settings: Omit<Setting, 'uid'>[]) => {
    await db.insert(settingsTable)
        .values(settings)
        .onConflictDoUpdate({ target: settingsTable.key, set: conflictUpdateAllExcept(settingsTable, ['key', 'uid']) });
}