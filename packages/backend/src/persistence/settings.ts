import { settingsTable } from "@mnt/common/db";
import type { InsertSetting, Setting } from "@mnt/common/db/types";
import { eq } from "drizzle-orm";
import { db } from "../db/db";
import { conflictUpdateAllExcept } from "./helper";

export const upsertSettings = async (
	settings: Omit<InsertSetting, "uid">[],
) => {
	await db
		.insert(settingsTable)
		.values(settings)
		.onConflictDoUpdate({
			target: settingsTable.key,
			set: conflictUpdateAllExcept(settingsTable, ["key", "uid"]),
		});
};

export const getSettingByKey = async (key: string): Promise<Setting> => {
	const res = await db
		.select()
		.from(settingsTable)
		.where(eq(settingsTable.key, key));
	return res[0];
};
