import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import type { balanceTSTable, blindedMessagesTable, keysetsTable, keysTable, meltQuotesTable, mintQuotesTable, outstandingPromisesTSTable, pendingProofsTSTable, proofsTable, settingsTable, userTable } from "./schema";

export type User = InferSelectModel<typeof userTable>;
export type Keyset = InferSelectModel<typeof keysetsTable>;
export type Keys = InferSelectModel<typeof keysTable>;
export type BlindedMessage = InferSelectModel<typeof blindedMessagesTable>;
export type Proof = InferSelectModel<typeof proofsTable>;
export type MintQuote = InferSelectModel<typeof mintQuotesTable>;
export type MeltQuote = InferSelectModel<typeof meltQuotesTable>;
export type Setting = InferSelectModel<typeof settingsTable>;
export type PendingProofsTS = InferSelectModel<typeof pendingProofsTSTable>;
export type OutstandingPromiseTS = InferSelectModel<typeof outstandingPromisesTSTable>;
export type BalanceTS = InferSelectModel<typeof balanceTSTable>;

export type InsertUser = InferInsertModel<typeof userTable>;
export type InsertKeyset = InferInsertModel<typeof keysetsTable>;
export type InsertKeys = InferInsertModel<typeof keysTable>;
export type InsertBlindedMessage = InferInsertModel<typeof blindedMessagesTable>;
export type InsertProof = InferInsertModel<typeof proofsTable>;
export type InsertMintQuote = InferInsertModel<typeof mintQuotesTable>;
export type InsertMeltQuote = InferInsertModel<typeof meltQuotesTable>;
export type InsertSetting = InferInsertModel<typeof settingsTable>;
export type InsertPendingProofsTS = InferInsertModel<typeof pendingProofsTSTable>;
export type InsertOutstandingPromiseTS = InferInsertModel<typeof outstandingPromisesTSTable>;
export type InsertBalanceTS = InferInsertModel<typeof balanceTSTable>;
