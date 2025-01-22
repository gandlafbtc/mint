import { MintError } from '../types/index';
import { findPrivKeyForAmountFromKeyset, randomHexString } from "../util/util";
import { type KeysetPair, createBlindSignature, createNewMintKeys, verifyProof } from '@cashu/crypto/modules/mint';
import { hashToCurve, pointFromHex, type Keyset, type SerializedBlindSignature, type SerializedProof } from "@cashu/crypto/modules/common";
import { CheckStateEnum, MeltQuoteState, type MeltQuoteResponse } from "@cashu/cashu-ts";
import { deserializeProof } from "@cashu/crypto/modules/client";
import type { Lightning } from '../interface/Lightning';
import { schnorr } from "@noble/curves/secp256k1";
import { mnemonicToSeed } from "@scure/bip39";
import { HDKey } from "@scure/bip32";
import { bytesToHex } from "@noble/curves/abstract/utils";
import { persistence } from "../../instances/mint";
import type { BlindedMessage, InsertBlindedMessage, InsertMeltQuote, InsertMintQuote, MeltQuote, MintQuote, Setting } from "@mnt/common/db/types";
import { settings } from "./Settings";
import { MintQuoteState, type SerializedBlindedMessage } from "@cashu/cashu-ts";
import { getAmountsForAmount } from '../../util';
import { db } from '../../db/db';
import type { SQLiteTransaction } from 'drizzle-orm/sqlite-core';
import { getAll } from '../../persistence/generic';
import { keysetsTable, settingsTable } from '@mnt/common/db';
import { type Keyset as DBKeyset } from '@mnt/common/db/types';
import { connect } from 'bun';
import { connectBackend } from '../../backend/connect/connect';
import { log } from '../../logger';
import { createTransaction } from '../../db/tx';

export class CashuMint {

    private lightningInterface: Lightning | undefined

    getLightningInterface() {
        return this.lightningInterface
    }

    setLightningInterface(lightningInterface: Lightning) {
        this.lightningInterface = lightningInterface
    }
    constructor() {

    }

    async createKeysFromSeed(menmonicOrseed?: string | Uint8Array): Promise<{ pubKey: Uint8Array, privKey: Uint8Array }> {
        log.debug`Create mint keys...`
        let privKey = undefined
        let pubKey = undefined
        if (!menmonicOrseed) {
            log.debug`... with mnemnonic`
            privKey = schnorr.utils.randomPrivateKey();
        }
        else {
            log.debug`... without mnemnonic`
            if (typeof menmonicOrseed === 'string') {
                menmonicOrseed = await mnemonicToSeed(menmonicOrseed)
            }
            const hdkey = HDKey.fromMasterSeed(menmonicOrseed);
            // todo what kind of derivation to use?
            const derivationPath = `m/129372'/0'/0'/129372'`;
            const derived = hdkey.derive(derivationPath);
            privKey = derived.privateKey
            if (!privKey) {
                throw new MintError(601, 'Could not create keys from seed')
            }
        }
        pubKey = schnorr.getPublicKey(privKey)
        log.debug`Created mint keys. Pubkey: ${pubKey}`
        const persisted = await persistence.insertSeedKeys({ privKey: bytesToHex(privKey), pubKey: bytesToHex(pubKey) })
        if (!persisted?.privKey) {
            throw new MintError(602, 'Could not persist keys from seed')
        }
        return { privKey, pubKey }
    }

    async createKeysetPair() {
        log.debug`Create new keypair`
        const mintKeys = createNewMintKeys(32)
        const persisted = await persistence.addKeyset(mintKeys)
        return persisted
    }

    async getKeys(keysetIds: string): Promise<KeysetPair> {
        return await persistence.getKeys(keysetIds)
    }

    async getKeysets(): Promise<Keyset[]> {
        return await persistence.getKeysets()
    }

    async swap(inputs: SerializedProof[], outputs: SerializedBlindedMessage[]): Promise<SerializedBlindSignature[]> {
        log.debug`Perform swap operation...`
        const checkKeysets: KeysetSettingsCheck = {
            swapInKSIDs: [...new Set(outputs.map(o => o.id))],
            swapOutKSIDs: [...new Set(inputs.map(i => i.id))],
        }
        await this.checkKeysetSettings(checkKeysets)

        await this.validateProofs(inputs)

        await this.checkProofsSpent(inputs)

        let signedOutputs: InsertBlindedMessage[] = []

        const isAmountMatch = inputs.reduce((prev, curr) => prev + curr.amount, 0) === outputs.reduce((prev, curr) => prev + curr.amount, 0)

        if (!isAmountMatch) {
            throw new MintError(110, 'input and output amount dont match');
        }

        const keys = await this.getKeys(outputs[0].id)
        signedOutputs = outputs.map((o) => {
            if (!keys.privKeys[o.amount]) {
                throw new MintError(123, "Keyset does not have amount: " + o.amount)
            }
            return { changeId: null, quoteId: null, unit: 'sat', amount: o.amount, id: o.id, B_: o.B_, C_: createBlindSignature(pointFromHex(o.B_), keys.privKeys[o.amount], o.amount, o.id).C_.toHex(true) }
        })

        const enc = new TextEncoder()
            const tx = createTransaction(db)
            return await tx.transaction(async ({db})=> {
                await persistence.insertProofs(inputs.map(p => { return { ...p, status: CheckStateEnum.SPENT, Y: hashToCurve(enc.encode(p.secret)).toHex(true) } }, db))
                const messages = await persistence.insertMessages(signedOutputs, db)
                return messages.map(m=> {return {amount: m.amount, C_: m.C_, id: m.id}})
            })
    }

    async mintQuote(amount: number, method: "bolt11", unit: "sat"): Promise<MintQuote> {
        if (!this.lightningInterface) {
            await connectBackend()
        }
        if (!this.lightningInterface) {
            throw new Error("No backend configured");
        }
        await this.checkMintSettings(amount)

        const invoice = await this.lightningInterface.getNewInvoice(amount)
        if (!invoice.paymentRequest) {
            throw new Error("No payment request");
        }
        if (!invoice.rHash) {
            throw new Error("No hash");
        }
        if (typeof invoice.rHash !== 'string') {
            if (invoice.rHash instanceof Buffer) {
                invoice.rHash = new Uint8Array(invoice.rHash)
            }
            invoice.rHash = bytesToHex(invoice.rHash)
        }
        const mintQuote: InsertMintQuote = {
            state: "UNPAID",
            expiry: Math.floor(Date.now() / 1000) + settings.quoteExpiry,
            quote: randomHexString(),
            request: invoice.paymentRequest,
            hash: invoice.rHash,
            amount,
            description: null,
            unit: 'sat'
        }
        return await persistence.createMintQuote(mintQuote)
    }

    async getMintQuote(quote: string): Promise<MintQuote> {
        if (!this.lightningInterface) {
            await connectBackend()
        }
        if (!this.lightningInterface) {
            throw new Error("No backend configured");
        }
        const mintQuote = await persistence.getMintQuote(quote)
        if (!mintQuote) {
            throw new MintError(120, 'No mint quote found with id:' + quote)
        }
        const invoice = await this.lightningInterface.getInvoice(mintQuote.hash)
        if (invoice.state === "SETTLED" && mintQuote.state !== 'ISSUED') {
            mintQuote.state = 'PAID'
            persistence.updateMintQuote(mintQuote)
        }
        return mintQuote
    }

    async mint(quote: string, outputs: (SerializedBlindedMessage)[]): Promise<SerializedBlindSignature[]> {
        const mintQuote = await this.getMintQuote(quote)
        await this.checkMintSettings(mintQuote.amount)

        const checkKeysets: KeysetSettingsCheck = {
            mintKSIDs: [...new Set(outputs.map(o => o.id))],
        }

        await this.checkKeysetSettings(checkKeysets)

        //check if mint quote was paid
        if (!outputs.length) {
            throw new MintError(121, 'No outputs provided')
        }
        if (mintQuote.state === MintQuoteState.ISSUED) {
            throw new MintError(121, 'Mint quote has already been isssued:' + quote)
        }
        if (mintQuote.state === MintQuoteState.UNPAID) {
            throw new MintError(121, 'Mint quote has not been paid:' + quote)
        }

        // check if proof amount matches quote
        if (outputs.reduce((curr, acc) => { return curr + acc.amount }, 0) !== mintQuote.amount) {
            throw new MintError(123, 'Proof amount does not match quote:' + quote)
        }
        const keys = await this.getKeys(outputs[0].id)

        const signedOutputs = outputs.map((o) => {
            if (!keys.privKeys[o.amount]) {
                throw new MintError(123, "Keyset does not have amount: " + o.amount)
            }
            return { changeId: null, quoteId: quote, unit: 'sat', amount: o.amount, id: o.id, B_: o.B_, C_: createBlindSignature(pointFromHex(o.B_), keys.privKeys[o.amount], o.amount, o.id).C_.toHex(true) }
        })
        const tx = createTransaction(db)
        return await tx.transaction(async ({db})=> {
            await persistence.updateMintQuoteState(quote, MintQuoteState.ISSUED, db)
            await persistence.insertMessages(signedOutputs, db)
            //todo check against amount of issued signatures
            return signedOutputs.map(s => {
                return {
                    C_: s.C_,
                    amount: s.amount,
                    id: s.id
                }
            })

        })
    }

    async getMeltQuote(quote: string): Promise<MeltQuote> {
        const meltQuote = await persistence.getMeltQuote(quote)
        if (!meltQuote) {
            throw new MintError(120, 'No melt quote found with id:' + quote)
        }
        return meltQuote
    }

    async getChange(quote: string): Promise<BlindedMessage[]> {
        const change = await persistence.getChange(quote)
        return change
    }

    async meltQuote(request: string, unit = "sat"): Promise<MeltQuote> {
        if (!this.lightningInterface) {
            await connectBackend()
        }
        if (!this.lightningInterface) {
            throw new Error("No backend configured");
        }
        const { fee } = await this.lightningInterface.estimateFee(request)
        const { amount } = await this.lightningInterface.getInvoiceAmount(request)
        await this.checkMeltSettings(amount)
        const meltQuote: InsertMeltQuote = {
            state: "UNPAID",
            expiry: Math.floor(Date.now() / 1000) + settings.quoteExpiry,
            quote: randomHexString(),
            request,
            unit: unit,
            amount,
            fee_reserve: fee,
            payment_preimage: null
        }
        return await persistence.createMeltQuote(meltQuote)
    }

    async melt(quote: string, inputs: SerializedProof[], outputs?: SerializedBlindedMessage[]): Promise<MeltQuoteResponse> {
        if (!this.lightningInterface) {
            await connectBackend()
        }
        if (!this.lightningInterface) {
            throw new Error("No backend configured");
        }
        const meltQuote = await persistence.getMeltQuote(quote)
        await this.checkMeltSettings(meltQuote.amount)

        const checkKeysets: KeysetSettingsCheck = {
            meltKSIDs: [...new Set(inputs.map(i => i.id))],
        }

        await this.checkKeysetSettings(checkKeysets)
        await this.validateProofs(inputs)
        await this.checkProofsSpent(inputs)
        if (!meltQuote) {
            throw new MintError(111, 'Quote not found');
        }
        const isAmountMatch = inputs.reduce((prev, curr) => prev + curr.amount, 0) === meltQuote.amount + meltQuote.fee_reserve

        if (!isAmountMatch) {
            throw new MintError(111, 'melt failed amounts do not match: fee_reserve + amount != sum(inputs)');
        }
        const enc: TextEncoder = new TextEncoder()
        await persistence.insertProofs(inputs.map(p => {
            return {
                ...p, status: CheckStateEnum.PENDING,
                Y: hashToCurve(enc.encode(p.secret)).toHex(true)
            }
        }))

        const { preimage, fee } = await this.lightningInterface.payInvoice(meltQuote.request, meltQuote.fee_reserve * 1000)
        let insertedMessages: BlindedMessage[] | undefined = undefined
        if (preimage) {
            let updatedQuoteResponse: MeltQuoteResponse | undefined = undefined

            const feeDiff = meltQuote.fee_reserve - fee
            let signedOutputs: undefined | InsertBlindedMessage[] = undefined
            if (outputs?.length) {
                const keys = await this.getKeys(outputs[0].id)
                const keyAmounts = Object.keys(keys.pubKeys).map(k => parseInt(k)).sort((a: number, b: number) => b - a)
                const diffAmounts = getAmountsForAmount(feeDiff, keyAmounts)
                const outputsWithAmount: SerializedBlindedMessage[] = []
                for (let i = 0; i < diffAmounts.length; i++) {
                    outputsWithAmount.push({
                        amount: diffAmounts[i],
                        B_: outputs[i].B_,
                        id: outputs[i].id
                    })
                }

                signedOutputs = outputsWithAmount.map((o) => {
                    if (!keys.privKeys[o.amount]) {
                        throw new MintError(123, "Keyset does not have amount: " + o.amount)
                    }
                    return { changeId: quote, quoteId: null, unit: 'sat', amount: o.amount, id: o.id, B_: o.B_, C_: createBlindSignature(pointFromHex(o.B_), keys.privKeys[o.amount], o.amount, o.id).C_.toHex(true) }
                })
            }
            const tx = createTransaction(db)
            return await tx.transaction(async ({db})=> {
                if (signedOutputs) {
                    insertedMessages = await persistence.insertMessages(signedOutputs)
                }
                await persistence.updateProofStatus(inputs.map(p => p.secret), CheckStateEnum.SPENT)
                const updatedQuote = await persistence.updateMeltQuoteState(quote, MeltQuoteState.PAID)
                updatedQuoteResponse = {
                    amount: updatedQuote.amount,
                    expiry: updatedQuote.expiry,
                    fee_reserve: updatedQuote.fee_reserve,
                    payment_preimage: updatedQuote.payment_preimage,
                    quote: updatedQuote.quote,
                    state: updatedQuote.state as MeltQuoteState,
                    change: insertedMessages?.map(m => { return { amount: m.amount, C_: m.C_, id: m.id } })
                }
                return updatedQuoteResponse
            })
           
        }
        else {
            throw new Error("Melt failed: No preimage");
        }
    }

    async checkToken(Ys: string[]): Promise<{ Y: string, state: CheckStateEnum }[]> {
        const proofs = await persistence.getProofsByYs(Ys)
        return proofs.map(p => { return { Y: p.Y, state: p.status as CheckStateEnum } })
    }

    async restore(restoreBms: SerializedBlindedMessage[]): Promise<{ outputs: SerializedBlindedMessage[], signatures: SerializedBlindSignature[], promises: SerializedBlindSignature[] }> {
        const BMs = await persistence.getBMsByB_(restoreBms.map(b => b.B_))
        const outputs: SerializedBlindedMessage[] = []
        const signatures: SerializedBlindSignature[] = []
        const promises: SerializedBlindSignature[] = []

        const sortedBMs: BlindedMessage[] = []

        for (const bm of restoreBms) {
            const bmToSort = BMs.find(b => b.B_ === bm.B_)
            if (bmToSort) {
                sortedBMs.push(bmToSort)
            }
        }

        for (const bm of sortedBMs) {
            outputs.push({ amount: bm.amount, B_: bm.B_, id: bm.id })
            signatures.push({ amount: bm.amount, C_: bm.C_, id: bm.id })
            promises.push({ amount: bm.amount, C_: bm.C_, id: bm.id })
        }
        return { outputs, signatures, promises }
    }

    private async validateProofs(proofs: SerializedProof[]): Promise<void> {
        log.debug`Validate proofs [${proofs.length}]`
        const keysets = await this.getKeysets()
        const keysetIds = keysets.map(ks => ks.id)
        const containsUnknownKeysetId = proofs.find(p => !keysetIds.includes(p.id))
        if (containsUnknownKeysetId) {
            throw new MintError(100, "proofs contain unknown or disabled keyset ids")
        }
        const proofKeysets = [...new Set(proofs.map(p => p.id))]
        const keys: KeysetPair[] = []
        for (const ksId of proofKeysets) {
            keys.push(await this.getKeys(ksId))
        }
        const containsInvalidProof = proofs.find(p => !verifyProof(deserializeProof(p), findPrivKeyForAmountFromKeyset(keys, p.id, p.amount)))
        if (containsInvalidProof) {
            throw new MintError(102, 'contains invalid proof');
        }
    }
    private async checkProofsSpent(proofs: SerializedProof[]): Promise<void> {
        log.debug`Check proofs spent [${proofs.length}]`
        const secrets = proofs.map(p => p.secret)
        const containsSpentSecret = await persistence.containsSpentSecret(secrets)
        if (containsSpentSecret) {
            throw new MintError(101, 'contains already spent proof');
        }
    }
    private async checkKeysetSettings(keysetCheck: KeysetSettingsCheck): Promise<void> {
        log.debug('Checking keysets for operation: {keysetCheck}', { keysetCheck })
        const allKeysets = await getAll(keysetsTable) as DBKeyset[]
        for (const id of keysetCheck.meltKSIDs ?? []) {
            const unallowedMeltKs = allKeysets.find(ks => ks.hash === id && !ks.allowMelt)
            if (unallowedMeltKs) {
                throw new MintError(101, 'Melt is disabled for keyset: ' + id);
            }
        }
        for (const id of keysetCheck.mintKSIDs ?? []) {
            const unallowedMintKs = allKeysets.find(ks => ks.hash === id && !ks.allowMint)
            if (unallowedMintKs) {
                throw new MintError(101, 'Minting is disabled for keyset: ' + id);
            }
        }
        for (const id of keysetCheck.swapOutKSIDs ?? []) {
            const unallowedSwapOutKs = allKeysets.find(ks => ks.hash === id && !ks.allowSwapOut)
            if (unallowedSwapOutKs) {
                throw new MintError(101, 'Swap out is disabled for keyset: ' + id);
            }
        }
        for (const id of keysetCheck.swapInKSIDs ?? []) {
            const unallowedSwapInKs = allKeysets.find(ks => ks.hash === id && !ks.allowSwapIn)
            if (unallowedSwapInKs) {
                throw new MintError(101, 'Swap in is disabled for keyset: ' + id);
            }
        }
    }
    private async checkMintSettings(amount: number) {
        log.debug('Checking mint settings for amount: {amount}', { amount })
        const allSettings = await getAll(settingsTable) as Setting[]
        if (allSettings.find(s => s.key === 'minting-disabled')?.value === 'true' ? true : false) {
            throw new MintError(101, 'Minting is currently disabled');
        }
        const maxMintAmt = parseInt(allSettings.find(s => s.key === 'mint-max-amt')?.value ?? '0')
        if (maxMintAmt && maxMintAmt < amount) {
            throw new MintError(101, `Mint amount exceeds max allowed amount: tried = ${amount} , allowed = ${maxMintAmt}`);
        }
        const minMintAmt = parseInt(allSettings.find(s => s.key === 'mint-min-amt')?.value ?? '0')
        if (minMintAmt && minMintAmt > amount) {
            throw new MintError(101, `Mint amount is lower than min allowed amount: tried = ${amount} , allowed = ${minMintAmt}`);
        }
    }
    private async checkMeltSettings(amount: number) {
        const allSettings = await getAll(settingsTable) as Setting[]
        if (allSettings.find(s => s.key === 'melting-disabled')?.value === 'true' ? true : false) {
            throw new MintError(101, 'Melting is currently disabled');
        }
        const maxMeltAmt = parseInt(allSettings.find(s => s.key === 'melt-max-amt')?.value ?? '0')
        if (maxMeltAmt && maxMeltAmt < amount) {
            throw new MintError(101, `Melt amount exceeds max allowed amount: tried = ${amount} , allowed = ${maxMeltAmt}`);
        }
        const minMintAmt = parseInt(allSettings.find(s => s.key === 'melt-min-amt')?.value ?? '0')
        if (minMintAmt && minMintAmt > amount) {
            throw new MintError(101, `Melt amount is lower than min allowed amount: tried = ${amount} , allowed = ${minMintAmt}`);
        }
    }
}



type KeysetSettingsCheck = {
    meltKSIDs?: string[]
    mintKSIDs?: string[]
    swapOutKSIDs?: string[]
    swapInKSIDs?: string[]
}