import type { KeysetPair } from "@cashu/crypto/modules/mint";
import type { Keyset as SerializedKeyset } from "@cashu/crypto/modules/common";
import type { Unit } from "../types";
import { upsertSettings } from "../../persistence/settings";
import { SETTINGS_VERSION } from "../../const";
import { db as database } from "../../db/db";
import { blindedMessagesTable, keysetsTable, keysTable, meltQuotesTable, mintQuotesTable, proofsTable } from "@mnt/common/db";
import { type BlindedMessage, type InsertBlindedMessage, type InsertKeys, type InsertMeltQuote, type InsertMintQuote, type InsertProof, type Keys, type Keyset, type MeltQuote, type MintQuote, type Proof } from "@mnt/common/db/types";

import { bytesToHex } from "@noble/hashes/utils";
import { eq, inArray } from "drizzle-orm";
import { getKeypairById, getKeysetById } from "../../persistence/keysets";
import type { CheckStateEnum, MeltQuoteState, MintQuoteState, ProofState } from "@cashu/cashu-ts";
import { eventEmitter } from "../../events/emitter";
import { log } from "../../logger";
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";

export class MintPersistenceImpl {
    async insertSeedKeys(keys: { pubKey: string; privKey: string; },tx?: BunSQLiteDatabase): Promise<{ pubKey: string; privKey: string; }> {
        log.debug`Upserting mint keys...`
        await upsertSettings([
            { version: SETTINGS_VERSION, key: 'mint-pub-key', value: keys.pubKey },
            { version: SETTINGS_VERSION, key: 'mint-priv-key', value: keys.privKey }
        ])
        log.debug`Upserted mint keys in settings.`
        return { privKey: keys.privKey, pubKey: keys.pubKey }
    }

    async getKeys(keysetId: string,tx?: BunSQLiteDatabase): Promise<KeysetPair> {
        return await getKeypairById(keysetId)
    }
    async addKeyset(keysetPair: KeysetPair, unit = 'sat',tx?: BunSQLiteDatabase): Promise<Keyset[]> {
        const db = tx??database
        let allKeysets: Keyset[]
        log.debug`Adding keyset...`
        await db.update(keysetsTable).set({ isActive: false }).where(eq(keysetsTable.isActive, true))
        await db.insert(keysetsTable).values({
            hash: keysetPair.keysetId,
            allowMelt: true,
            allowMint: true,
            allowSwapIn: true,
            allowSwapOut: true,
            input_fee_ppk: 0,
            isActive: true,
            unit
        })
        const keys: InsertKeys[] = []
        for (const pubK of Object.entries(keysetPair.pubKeys)) {
            const amount = parseInt(pubK[0])
            keys.push({ amount, keysetHash: keysetPair.keysetId, pubKey: bytesToHex(pubK[1]), secKey: bytesToHex(keysetPair.privKeys[amount]), createdAt: Math.floor(Date.now() / 1000), updatedAt: Math.floor(Date.now() / 1000) })
        }
        await db.insert(keysTable).values(keys)
        log.debug`Keyset persisted`
        allKeysets = await db.select().from(keysetsTable)
        return allKeysets
    }
    async getKeysets(tx?: BunSQLiteDatabase): Promise<SerializedKeyset[]> {
        const db = tx??database
        const keysetsFromDb = await db.select().from(keysetsTable)
        const keysets: SerializedKeyset[] = keysetsFromDb.map((k) => { return { active: k.isActive ?? false, id: k.hash, unit: k.unit ?? 'sat' } })
        return keysets
    }

    async createMintQuote(quote: InsertMintQuote,tx?: BunSQLiteDatabase): Promise<MintQuote> {
        const db = tx??database
        const insertedQuote = (await db.insert(mintQuotesTable).values(
            quote
        ).returning())?.[0]
        eventEmitter.emit('socket-event', { command: 'inserted-mint-quote', data: { quote: insertedQuote } })
        return insertedQuote
    }

    async updateMintQuote(quote: MintQuote,tx?: BunSQLiteDatabase): Promise<MintQuote> {
        const db = tx??database
        await db.update(mintQuotesTable).set(quote).where(eq(mintQuotesTable.quote, quote.quote))
        return quote
    }
    async updateMintQuoteState(quote: string, state: MintQuoteState,tx?: BunSQLiteDatabase) {
        const db = tx??database
        await db.update(mintQuotesTable).set({ state: state }).where(eq(mintQuotesTable.quote, quote))
    }
    async getMintQuote(quote: string,tx?: BunSQLiteDatabase): Promise<MintQuote> {
        const db = tx??database
        const quotes = await db.select().from(mintQuotesTable).where(eq(mintQuotesTable.quote, quote))
        if (!quotes.length) {
            throw new Error("No such mint quote");
        }
        return quotes[0]
    }

    async insertMessages(messages: InsertBlindedMessage[],tx?: BunSQLiteDatabase) {
        const db = tx??database
        const insertedMessages = await db.insert(blindedMessagesTable).values(messages).returning()
        eventEmitter.emit('socket-event', { command: 'inserted-messages', data: { messages: insertedMessages } })
        return insertedMessages
    }

    async insertProofs(proofs: InsertProof[], tx?: BunSQLiteDatabase) {
        const db = tx??database
        const insertedProofs = await tx??db.insert(proofsTable).values(proofs).returning()
        eventEmitter.emit('socket-event', { command: 'inserted-proofs', data: { proofs: insertedProofs } })
        return insertedProofs
    }
    async updateProofStatus(secrets: string[], status: CheckStateEnum,tx?: BunSQLiteDatabase) {
        const db = tx??database
        return await db.update(proofsTable).set({ status: status }).where(inArray(proofsTable.secret, secrets))
    }

    async getMeltQuote(quote: string,tx?: BunSQLiteDatabase): Promise<MeltQuote> {
        const db = tx??database
        const quotes = await db.select().from(meltQuotesTable).where(eq(meltQuotesTable.quote, quote))
        if (!quotes.length) {
            throw new Error("No such mint quote");
        }
        return quotes[0]
    }
    async modifyKeysetStatus(keysetId: string, isEnabled: boolean,tx?: BunSQLiteDatabase): Promise<Keyset> {
        throw new Error("Method not implemented.");
    }
    async containsSpentSecret(secret: string[],tx?: BunSQLiteDatabase): Promise<boolean> {
        const db = tx??database
        const values = await db.select().from(proofsTable).$dynamic().where(inArray(proofsTable.status, ['SPENT', 'PENDING'])).where(inArray(proofsTable.secret, secret))
        return values.length ? true : false
    }
    async getProofsByYs(Ys: string[],tx?: BunSQLiteDatabase): Promise<Proof[]> {
        const db = tx??database
        const proofs = await db.select().from(proofsTable).where(inArray(proofsTable.Y, Ys))
        return proofs
    }

    async getBMsByB_(B_s: string[],tx?: BunSQLiteDatabase): Promise<BlindedMessage[]> {
        const db = tx??database
        const bms = await db.select().from(blindedMessagesTable).where(inArray(blindedMessagesTable.B_, B_s))
        return bms
    }

    async getChange(quote: string,tx?: BunSQLiteDatabase): Promise<BlindedMessage[]> {
        const db = tx??database
        const bms = await db.select().from(blindedMessagesTable).where(eq(blindedMessagesTable.changeId, quote))
        return bms
    }

    async getUnitFromId(id: string): Promise<Unit | undefined> {
        throw new Error("Method not implemented.");
    }
    async createMeltQuote(quote: InsertMeltQuote,tx?: BunSQLiteDatabase): Promise<MeltQuote> {
        const db = tx??database
        const insertedQuote = (await db.insert(meltQuotesTable).values(
            quote
        ).returning())?.[0]
        eventEmitter.emit('socket-event', { command: 'inserted-melt-quote', data: { quote: insertedQuote } })
        return insertedQuote
    }
    async updateMeltQuoteState(quote: string, state: MeltQuoteState,tx?: BunSQLiteDatabase): Promise<MeltQuote> {
        const db = tx??database
        const updated = await db.update(meltQuotesTable).set({ state: state }).where(eq(meltQuotesTable.quote, quote)).returning()
        return updated[0]
    }
    async getSeedKeys(): Promise<{ pubKey: string; privKey: string; }> {
        throw new Error("Method not implemented.");
    }
    async getActiveKeys(unit?: Unit): Promise<KeysetPair> {
        throw new Error("Method not implemented.");
    }
}
