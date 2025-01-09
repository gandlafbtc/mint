import type { Keyset } from "@cashu/crypto/modules/common";
import type { KeysetPair } from '@cashu/crypto/modules/mint';
import type { Unit } from "../types";
import type { MeltQuote, MintQuote } from "../../db/schema";

export interface MintPersistence {
    insertSeedKeys(keys: {pubKey: string, privKey: string}): Promise<{pubKey: string, privKey: string}> 
    getSeedKeys(): Promise<{pubKey: string, privKey: string}> 
    getKeys(keysetId?: string): Promise<KeysetPair> 
    getActiveKeys(unit?: Unit): Promise<KeysetPair>
    addKeyset(keysetPair: KeysetPair): Promise<KeysetPair>
    getKeysets(): Promise<Keyset[]>
    modifyKeysetStatus(keysetId: string, isEnabled: boolean): Promise<Keyset>
    containsSpentSecret(secret: string[]): Promise<boolean>
    getUnitFromId(id: string): Promise<Unit|undefined>
    createMintQuote(quote: MintQuote): Promise<MintQuote>
    createMeltQuote(quote: MeltQuote): Promise<MeltQuote>
    updateMeltQuote(quote: MeltQuote): Promise<MeltQuote>
    updateMintQuote(quote: MintQuote): Promise<MintQuote>
    getMintQuote(quote: string): Promise<MintQuote>
    getMeltQuote(quote: string): Promise<MeltQuote>
}