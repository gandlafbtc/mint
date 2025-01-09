import type { KeysetPair } from "@cashu/crypto/modules/mint"
import { bytesToHex } from "@noble/curves/abstract/utils";
import { randomBytes } from "@noble/hashes/utils";
import { MintError } from "../types";

export const findPrivKeyForAmountFromKeyset = (keys: KeysetPair[], id: string, amount: number): Uint8Array => {
    const keysetPair = keys.find(kp => kp.keysetId === id)
    if (keysetPair === undefined) {
        throw new MintError(122, "An output contained an unknown keyset ID: " + id)
    }
    if (!keysetPair.privKeys[amount]) {
        throw new MintError(123, "Keyset does not have amount: " + amount)
    }
    return keysetPair.privKeys[amount]
}

export function randomHexString(len: number = 16) {
    return bytesToHex(randomBytes(len))
}
