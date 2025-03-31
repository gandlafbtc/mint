import { drizzle } from "drizzle-orm/bun-sqlite";
import { log } from "../logger";

if (!process.env.DB_FILE_NAME) {
	log.error("DB_FILE_NAME environment variable is not set");
	process.exit(1);
}

export const db = drizzle(process.env.DB_FILE_NAME);
