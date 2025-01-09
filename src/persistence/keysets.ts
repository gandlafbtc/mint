import { eq, sql } from "drizzle-orm";
import { db } from "../db/db";
import { keysetsTable, keysTable, type Keyset } from "../db/schema";
import type { MintKeys } from "@cashu/cashu-ts";
import type { KeysetPair } from "@cashu/crypto/modules/mint";
import { hexToBytes } from "@noble/hashes/utils";

export const getKeypairById = async (keysetId: string): Promise<KeysetPair> => {
    const values = await db.select(
        {
            pubKey: keysTable.pubKey, 
            secKey: keysTable.secKey,
            amount: keysTable.amount
        }
    )
        .from(keysTable)
        .where(eq(keysTable.keysetHash, keysetId))
    
    const keysetPair: KeysetPair = {
        keysetId,
        privKeys:{},
        pubKeys:{}
    }

    for (const elem of values) {
        keysetPair.privKeys[elem.amount] = hexToBytes(elem.secKey)
        keysetPair.pubKeys[elem.amount] = hexToBytes(elem.secKey)
    }
   
    return keysetPair
}

export const getActiveKeys = async (): Promise<MintKeys[]> => {
    const values = (await db.select(
        {
            id: keysetsTable.hash,
            unit: keysetsTable.unit,
            key: keysTable.pubKey,
            amount: keysTable.amount
        }
    )
        .from(keysetsTable)
        .leftJoin(keysTable, eq(keysetsTable.hash, keysTable.keysetHash))
        .where(sql`${keysetsTable.isActive}=${1}`)).map(r => {
            return {
                id: r.id,
                unit: r.unit,
                key: r.key,
                amount: r.amount
            }
        })
    
    const activeKeys: MintKeys[] = []
    for (const elem of values) {
        const keyset = activeKeys.find(ks=> ks.id===elem.id)
        if (!elem.amount) {
            throw new Error("Amount cannot be 0 or null");
        }
        if (keyset) {
            keyset.keys[elem.amount] = elem.key??''
        }
        else {
            const newKs: MintKeys = {
                id: elem.id,
                unit: elem.unit??'sat',
                keys: {
                    
                }
            }
            newKs.keys[elem.amount] =  elem.key??''
            activeKeys.push(newKs)
        }
    }
    return activeKeys
}

export const getKeysetById = async (id: string): Promise<MintKeys[]> => {
    const values = (await db.select(
        {
            id: keysetsTable.hash,
            unit: keysetsTable.unit,
            key: keysTable.pubKey,
            amount: keysTable.amount
        }
    )
        .from(keysetsTable)
        .leftJoin(keysTable, eq(keysetsTable.hash, keysTable.keysetHash))
        .where(sql`${keysetsTable.hash}=${id}`))
        .map(r => {
            return {
                id: r.id,
                unit: r.unit,
                key: r.key,
                amount: r.amount
            }
        })
    
    const activeKeys: MintKeys[] = []
    for (const elem of values) {
        const keyset = activeKeys.find(ks=> ks.id===elem.id)
        if (!elem.amount) {
            throw new Error("Amount cannot be 0 or null");
        }
        if (keyset) {
            keyset.keys[elem.amount] = elem.key??''
        }
        else {
            const newKs: MintKeys = {
                id: elem.id,
                unit: elem.unit??'sat',
                keys: {
                    
                }
            }
            newKs.keys[elem.amount] =  elem.key??''
            activeKeys.push(newKs)
        }
    }
    return activeKeys
}