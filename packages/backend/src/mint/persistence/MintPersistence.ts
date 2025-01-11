import type { KeysetPair } from "@cashu/crypto/modules/mint";
import type { Keyset as SerializedKeyset } from "@cashu/crypto/modules/common";
import type { Unit } from "../types";
import { upsertSettings } from "../../persistence/settings";
import { SETTINGS_VERSION } from "../../const";
import { db } from "../../db/db";
import { blindedMessagesTable, keysetsTable, keysTable, meltQuotesTable, mintQuotesTable, proofsTable } from "@mnt/common/db";
import { type InsertBlindedMessage, type InsertMeltQuote, type InsertMintQuote, type InsertProof, type Keys, type Keyset, type MeltQuote, type MintQuote } from "@mnt/common/db/types";

import { bytesToHex } from "@noble/hashes/utils";
import { eq, inArray } from "drizzle-orm";
import { getKeypairById, getKeysetById } from "../../persistence/keysets";
import type { CheckStateEnum, MeltQuoteState, MintQuoteState, ProofState } from "@cashu/cashu-ts";
import { eventEmitter } from "../../events/emitter";

export class MintPersistenceImpl {
    async insertSeedKeys(keys: { pubKey: string; privKey: string; }): Promise<{ pubKey: string; privKey: string; }> {
        await upsertSettings([
            { version: SETTINGS_VERSION, key: 'mint-pub-key', value: keys.pubKey },
            { version: SETTINGS_VERSION, key: 'mint-priv-key', value: keys.privKey }
        ])
        return { privKey: keys.privKey, pubKey: keys.pubKey }
    }

    async getKeys(keysetId: string): Promise<KeysetPair> {
        return await getKeypairById(keysetId)
    }
    async addKeyset(keysetPair: KeysetPair, unit = 'sat'): Promise<Keyset[]> {
        let allKeysets: Keyset[]
        return db.transaction(async (t) => {
            await t.update(keysetsTable).set({ isActive: false }).where(eq(keysetsTable.isActive, true))
            await t.insert(keysetsTable).values({
                hash: keysetPair.keysetId,
                allowMelt: true,
                allowMint: true,
                allowSwapIn: true,
                allowSwapOut: true,
                input_fee_ppk: 0,
                isActive: true,
                unit
            })
            const keys: Omit<Keys, 'uid'>[] = []
            for (const pubK of Object.entries(keysetPair.pubKeys)) {
                const amount = parseInt(pubK[0])
                keys.push({ amount, keysetHash: keysetPair.keysetId, pubKey: bytesToHex(pubK[1]), secKey: bytesToHex(keysetPair.privKeys[amount]), createdAt: Math.floor(Date.now()/1000), updatedAt:  Math.floor(Date.now()/1000)})
            }
            await t.insert(keysTable).values(keys)
            allKeysets = await t.select().from(keysetsTable)
        }).then(()=> {
            return allKeysets
        }).catch((e)=> {
            throw new Error("Transaction error");
        })
    }
    async getKeysets(): Promise<SerializedKeyset[]> {
        const keysetsFromDb = await db.select().from(keysetsTable)
        const keysets: SerializedKeyset[] = keysetsFromDb.map((k) => { return { active: k.isActive ?? false, id: k.hash, unit: k.unit ?? 'sat' } })
        return keysets
    }

    async createMintQuote(quote: InsertMintQuote): Promise<MintQuote> {
        const insertedQuote = (await db.insert(mintQuotesTable).values(
            quote
        ).returning())?.[0]
        eventEmitter.emit('socket-event', {command: 'inserted-mint-quote', data: {quote: insertedQuote}})
        return insertedQuote
    }

    async updateMintQuote(quote: MintQuote): Promise<MintQuote> {
        await db.update(mintQuotesTable).set(quote).where(eq(mintQuotesTable.quote, quote.quote))
        return quote
    }
    async updateMintQuoteState(quote: string, state: MintQuoteState) {
        await db.update(mintQuotesTable).set({ state: state }).where(eq(mintQuotesTable.quote, quote))
    }
    async getMintQuote(quote: string): Promise<MintQuote> {
        const quotes = await db.select().from(mintQuotesTable).where(eq(mintQuotesTable.quote, quote))
        if (!quotes.length) {
            throw new Error("No such mint quote");
        }
        return quotes[0]
    }

    async insertMessages(messages: InsertBlindedMessage[]) {
        const insertedMessages = await db.insert(blindedMessagesTable).values(messages).returning()
        eventEmitter.emit('socket-event', {command: 'inserted-messages', data: {messages: insertedMessages}})
        return insertedMessages
    }

    async insertProofs(proofs: InsertProof[]) {
        const insertedProofs = await db.insert(proofsTable).values(proofs).returning()
        eventEmitter.emit('socket-event', {command: 'inserted-proofs', data:{proofs: insertedProofs}})
        return insertedProofs

    }
    async updateProofStatus(secrets: string[], status: CheckStateEnum) {
        await db.update(proofsTable).set({ status: status }).where(inArray(proofsTable.secret, secrets))
    }

    async getMeltQuote(quote: string): Promise<MeltQuote> {
        const quotes = await db.select().from(meltQuotesTable).where(eq(meltQuotesTable.quote, quote))
        if (!quotes.length) {
            throw new Error("No such mint quote");
        }
        return quotes[0]
    }
    async modifyKeysetStatus(keysetId: string, isEnabled: boolean): Promise<Keyset> {
        throw new Error("Method not implemented.");
    }
    async containsSpentSecret(secret: string[]): Promise<boolean> {
        const values = await db.select().from(proofsTable).$dynamic().where(inArray(proofsTable.status, ['SPENT', 'PENDING'])).where(inArray(proofsTable.secret, secret))
        return values.length ? true : false
    }
    async getUnitFromId(id: string): Promise<Unit | undefined> {
        throw new Error("Method not implemented.");
    }
    async createMeltQuote(quote: InsertMeltQuote): Promise<MeltQuote> {
        const insertedQuote = (await db.insert(meltQuotesTable).values(
            quote
        ).returning())?.[0]
        eventEmitter.emit('socket-event', {command: 'inserted-melt-quote', data: {quote: insertedQuote}})
        return insertedQuote
    }
    async updateMeltQuoteState(quote: string, state: MeltQuoteState): Promise<MeltQuote> {
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