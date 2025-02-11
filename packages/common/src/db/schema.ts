import { sql } from "drizzle-orm";
import { int, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

const timestamps = {
    updatedAt: integer().notNull().default(sql`(unixepoch())`),
    createdAt: integer().notNull().default(sql`(unixepoch())`),
  }

export const userTable = sqliteTable("user", {
	id: text("id").primaryKey().$defaultFn(()=> crypto.randomUUID()),
    username: text('username').notNull().unique(),
	passwordHash: text('password_hash').notNull(),
    ...timestamps
});

export const settingsTable = sqliteTable('settings', {
    uid: int().primaryKey({ autoIncrement: true }),
    key: text().notNull().unique(),
    value: text().notNull(),
    version: int().notNull(),
    ...timestamps
})

export const keysetsTable = sqliteTable("keysets", {
    hash: text().primaryKey(),
    unit: text(),
    isActive: integer({ mode: 'boolean' }),
    allowMelt: integer({ mode: 'boolean' }),
    allowMint: integer({ mode: 'boolean' }),
    allowSwapOut: integer({ mode: 'boolean' }),
    allowSwapIn: integer({ mode: 'boolean' }),
    input_fee_ppk: int(),
    ...timestamps
});



export const keysTable = sqliteTable("keys", {
    uid: int().primaryKey({ autoIncrement: true }),
    amount: int().notNull(),
    pubKey: text().notNull().unique(),
    secKey:  text().notNull().unique(),
    keysetHash: text().notNull().references(() => keysetsTable.hash),
    ...timestamps
})

export const blindedMessagesTable = sqliteTable("blinded_messages", {
    uid: int().primaryKey({ autoIncrement: true }),
    id: text().references(()=>keysetsTable.hash).notNull(),
    unit: text(),
    amount: int().notNull(),
    B_: text().unique().notNull(),
    C_: text().unique().notNull(),
    quoteId: text().references(()=>mintQuotesTable.quote),
    changeId: text().references(()=>meltQuotesTable.quote),
    ...timestamps
});

export const proofsTable = sqliteTable("proofs", {
    uid: int().primaryKey({ autoIncrement: true }),
    id: text().references(()=>keysetsTable.hash).notNull(),
    secret: text().unique().notNull(),
    Y: text().unique().notNull(),
    C: text().unique().notNull(),
    amount: int().notNull(),
    status: text().notNull(),
    meltId: text().references(()=>mintQuotesTable.quote),
    ...timestamps
});

export const mintQuotesTable = sqliteTable("mint_quotes", {
    quote: text().primaryKey(),
    amount: int().notNull(),
    unit: text(),
    description:text(),
    request: text().notNull(),
    hash: text().notNull(),
    state: text().notNull(),
    expiry: integer().notNull(),
    ...timestamps
});

export const meltQuotesTable = sqliteTable("melt_quotes", {
    quote: text().primaryKey(),
    amount: int().notNull(),
    unit: text(),
    request: text().notNull(),
    state: text().notNull(),
    fee_reserve: int().notNull(),
    payment_preimage: text(),
    expiry: integer().notNull(),
    ...timestamps
});

export const pendingProofsTSTable = sqliteTable("pending_proofs_ts", {
    dt: int().primaryKey().default(sql`(unixepoch())`),
    amount: int(),
    count: int()
});

export const outstandingPromisesTSTable = sqliteTable("outstanding_promises_ts", {
    dt: int().primaryKey().default(sql`(unixepoch())`),
    amount: int(),
    count: int()
});

export const balanceTSTable = sqliteTable("balance_ts", {
    dt: int().primaryKey().default(sql`(unixepoch())`),
    amount: int(),
});