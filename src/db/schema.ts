import { sql, type InferSelectModel } from "drizzle-orm";
import { int, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const userTable = sqliteTable("user", {
	id: text("id").primaryKey().$defaultFn(()=> crypto.randomUUID()),
    username: text('username').notNull().unique(),
	passwordHash: text('password_hash').notNull()
});

export const settingsTable = sqliteTable('settings', {
    uid: int().primaryKey({ autoIncrement: true }),
    key: text().notNull().unique(),
    value: text(),
    version: int()
})

export const keysetsTable = sqliteTable("keysets", {
    hash: text().primaryKey().unique(),
    unit: text(),
    isActive: integer({ mode: 'boolean' }),
    allowMelt: integer({ mode: 'boolean' }),
    allowMint: integer({ mode: 'boolean' }),
    allowSwapOut: integer({ mode: 'boolean' }),
    allowSwapIn: integer({ mode: 'boolean' }),
    input_fee_ppk: int()
});

export const keysTable = sqliteTable("keys", {
    amount: int().primaryKey(),
    pubKey: text().unique(),
    secKey:  text().unique()
})

export const blindedMessagesTable = sqliteTable("blinded_messages", {
    uid: int().primaryKey({ autoIncrement: true }),
    id: text().references(()=>keysetsTable.hash),
    unit: text(),
    amount: int(),
    B_: text().unique(),
    C_: text().unique()
});

export const proofsTable = sqliteTable("proofs", {
    uid: int().primaryKey({ autoIncrement: true }),
    id: text().references(()=>keysetsTable.hash),
    secret: text().unique(),
    C: text().unique(),
    amount: int(),
    status: text()
});

export const mintQuotesTable = sqliteTable("mint_quotes", {
    quote: text().primaryKey().unique(),
    amount: int(),
    unit: text(),
    description:text(),
    request: text(),
    state: text(),
    expiry: integer({mode: "timestamp"})
});

export const meltQuotesTable = sqliteTable("melt_quotes", {
    quote: text().primaryKey().unique(),
    amount: int(),
    unit: text(),
    request: text(),
    state: text(),
    fee_reserve: int(),
    payment_preimage: text(),
    expiry: integer({mode: "timestamp"})
});

export type User = InferSelectModel<typeof userTable>;
export type Keyset = InferSelectModel<typeof keysetsTable>;
export type Keys = InferSelectModel<typeof keysTable>;
export type BlindedMessage = InferSelectModel<typeof blindedMessagesTable>;
export type Proof = InferSelectModel<typeof proofsTable>;
export type MintQuote = InferSelectModel<typeof mintQuotesTable>;
export type MeltQuote = InferSelectModel<typeof meltQuotesTable>;
export type Setting = InferSelectModel<typeof settingsTable>;

