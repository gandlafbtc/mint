import { drizzle } from "drizzle-orm/bun-sqlite";

export const db = drizzle(process.env.DB_FILE_NAME!);
