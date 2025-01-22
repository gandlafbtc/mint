import { eq } from "drizzle-orm";
import { db } from "../db/db";
import type { MintKeys } from "@cashu/cashu-ts";
import type { KeysetPair } from "@cashu/crypto/modules/mint";
import { hexToBytes } from "@noble/hashes/utils";
import { keysetsTable, keysTable } from "@mnt/common/db";
import type { Keyset } from "@mnt/common/db/types";
import { eventEmitter } from "../events/emitter";

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
        .where(eq(keysetsTable.isActive, true))).map(r => {
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
        .where(eq(keysetsTable.hash, id)))
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

export const updateKeyset = async (keyset: Keyset) => {
    const values = await db.update(keysetsTable).set(keyset).where(eq(keysetsTable.hash, keyset.hash)).returning()
    eventEmitter.emit('socket-event', { command: 'updated-keyset', data: { keyset: values[0] } })
    return values[0]
}