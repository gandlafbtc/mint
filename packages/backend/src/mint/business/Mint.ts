import { MintError, type Secret } from '../types/index';
import { findPrivKeyForAmountFromKeyset, randomHexString } from "../util/util";
import { type KeysetPair,createBlindSignature,createNewMintKeys, verifyProof } from '@cashu/crypto/modules/mint';
import { pointFromHex , type BlindSignature, type Keyset, type Proof, type SerializedBlindSignature, type SerializedProof } from "@cashu/crypto/modules/common";
import { CheckStateEnum, MeltQuoteState } from "@cashu/cashu-ts";
import { deserializeProof, serializeProof } from "@cashu/crypto/modules/client";
import type { Lightning } from '../interface/Lightning';
import { schnorr } from "@noble/curves/secp256k1";
import { mnemonicToSeed } from "@scure/bip39";
import { HDKey } from "@scure/bip32";
import { bytesToHex, hexToBytes } from "@noble/curves/abstract/utils";
import { mint, persistence } from "../../instances/mint";
import type { InsertMeltQuote, InsertMintQuote, MeltQuote, MintQuote } from "@mnt/common/db/types";
import { date } from "drizzle-orm/mysql-core";
import { env } from "bun";
import { settings } from "./Settings";
import { MintQuoteState, type SerializedBlindedMessage } from "@cashu/cashu-ts";

export class CashuMint {

    private lightningInterface: Lightning

    constructor(lightningInterface: Lightning) {
        this.lightningInterface = lightningInterface
    }

    async createKeysFromSeed(menmonicOrseed?: string|Uint8Array): Promise<{pubKey: Uint8Array, privKey: Uint8Array}> {
        let privKey = undefined
        let pubKey = undefined
        if (!menmonicOrseed) {
            privKey = schnorr.utils.randomPrivateKey();
        }
        else {
            if (typeof menmonicOrseed === 'string') {
                menmonicOrseed = await mnemonicToSeed(menmonicOrseed)
            }
            const hdkey = HDKey.fromMasterSeed(menmonicOrseed);
            // todo what kind of derivation to use?
            const derivationPath = `m/129372'/0'/0'/129372'`;
            const derived = hdkey.derive(derivationPath);
            privKey = derived.privateKey
            if (!privKey) {
                throw new MintError(601,'Could not create keys from seed')
            }
        }
        pubKey = schnorr.getPublicKey(privKey)
        const persisted = await persistence.insertSeedKeys({privKey: bytesToHex(privKey), pubKey: bytesToHex(pubKey)})
        if (!persisted?.privKey) {
            throw new MintError(602,'Could not persist keys from seed')
        }
        return {privKey, pubKey}
    }

    async createKeysetPair() {
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
        const isValid = await this.validateProofs(inputs)
        if (!isValid) {
            throw new MintError(111, 'Token not valid');
        }
        const isAmountMatch = inputs.reduce((prev, curr) => prev+curr.amount,0)===outputs.reduce((prev, curr) => prev+curr.amount,0)
        if (!isAmountMatch) {
            throw new MintError(110, 'input and output amount dont match');
        }
        //todo put into transaction
        
        const keys = await this.getKeys(outputs[0].id)

        const signedOutputs = outputs.map((o)=> {
            if (!keys.privKeys[o.amount]) {
                throw new MintError(123,"Keyset does not have amount: "+o.amount)
            }
            return { changeId:null, quoteId: null, unit: 'sat', amount: o.amount, id: o.id, B_: o.B_, C_: createBlindSignature(pointFromHex(o.B_), keys.privKeys[o.amount], o.amount, o.id).C_.toHex(true)}
        })
        //todo put this into transaction and check against amount of issued signatures
        await persistence.insertProofs(inputs.map(p=> {return {...p, status: CheckStateEnum.UNSPENT}}))
        await persistence.insertMessages(signedOutputs)
        return signedOutputs.map(s=> { return {
            C_:s.C_,
            amount: s.amount,
            id: s.id
        }})
    }

    async mintQuote(amount: number, method: "bolt11", unit: "sat"): Promise<MintQuote> {
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
            invoice.rHash=bytesToHex(invoice.rHash)
        }
        const mintQuote: InsertMintQuote = {
            state: "UNPAID",
            expiry: Math.floor(Date.now()/1000)+settings.quoteExpiry,
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
        const mintQuote = await persistence.getMintQuote(quote)
        if (!mintQuote) {
            throw new MintError(120,'No mint quote found with id:' + quote)
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
        //check if mint quote was paid
        if (!outputs.length) {
            throw new MintError(121,'No outputs provided')
        }
        if (mintQuote.state===MintQuoteState.ISSUED) {
            throw new MintError(121,'Mint quote has already been isssued:' + quote)
        }
        if (mintQuote.state===MintQuoteState.UNPAID) {
            throw new MintError(121,'Mint quote has not been paid:' + quote)
        }
        
        // check if proof amount matches quote
        if (outputs.reduce((curr, acc)=>{return curr+acc.amount},0) !== mintQuote.amount) {
            throw new MintError(123,'Proof amount does not match quote:' + quote)
        }
        const keys = await this.getKeys(outputs[0].id)

        const signedOutputs = outputs.map((o)=> {
            if (!keys.privKeys[o.amount]) {
                throw new MintError(123,"Keyset does not have amount: "+o.amount)
            }
            return { changeId:null, quoteId: quote, unit: 'sat', amount: o.amount, id: o.id, B_: o.B_, C_: createBlindSignature(pointFromHex(o.B_), keys.privKeys[o.amount], o.amount, o.id).C_.toHex(true)}
        })
        //todo put this into transaction and check against amount of issued signatures
        await persistence.updateMintQuoteState(quote, MintQuoteState.ISSUED)
        await persistence.insertMessages(signedOutputs)
        return signedOutputs.map(s=> { return {
            C_:s.C_,
            amount: s.amount,
            id: s.id
        }})
    }

    async getMeltQuote(quote: string): Promise<MeltQuote> {
        const meltQuote = await persistence.getMeltQuote(quote)
        if (!meltQuote) {
            throw new MintError(120,'No melt quote found with id:' + quote)
        }
        return meltQuote
    }

    async meltQuote(request: string, unit = "sat"): Promise<MeltQuote> {
        const {fee} = await this.lightningInterface.estimateFee(request)
        const { amount } = await this.lightningInterface.getInvoiceAmount(request)
        const meltQuote: InsertMeltQuote = {
            state: "UNPAID",
            expiry: Math.floor(Date.now()/1000)+settings.quoteExpiry,
            quote: randomHexString(),
            request,
            unit: unit,
            amount,
            fee_reserve: fee,
            payment_preimage: null
        }
        return await persistence.createMeltQuote(meltQuote)
    }

    async melt(quote: string, inputs: SerializedProof[], outputs?: SerializedBlindedMessage[]): Promise<MeltQuote & {signatures?: SerializedBlindSignature[]}> {
        const isValid = await this.validateProofs(inputs)
        const meltQuote = await persistence.getMeltQuote(quote)
        if (!meltQuote) {
            throw new MintError(111, 'Quote not found');
        }
        const isAmountMatch = inputs.reduce((prev, curr) => prev+curr.amount,0)===meltQuote.amount + meltQuote.fee_reserve

        if (!isAmountMatch) {
            throw new MintError(111, 'melt failed amounts do not match: fee_reserve + amount != sum(inputs)');
        }
        if (!isValid) {
            throw new MintError(111, 'Token not valid');
        }
        await persistence.insertProofs(inputs.map(p=> {return {
            ...p, status: CheckStateEnum.PENDING
        }}))
        const { preimage } = await this.lightningInterface.payInvoice(meltQuote.request, meltQuote.fee_reserve*1000)
        if ( preimage ) {
            const updatedQuote = await persistence.updateMeltQuoteState(quote, MeltQuoteState.PAID)
            await persistence.updateProofStatus(inputs.map(p=> p.secret), CheckStateEnum.SPENT)
            //todo create fee return sigs
            return updatedQuote
        }
        else {
            throw new Error("Melt failed: No preimage");
        }
    }

    checkToken(proofs: Secret[]): Promise<{ spendable: boolean[]; pending: boolean[]; }> {
        throw new Error("Method not implemented.");
    }

    private async validateProofs(proofs: SerializedProof[]): Promise<boolean> {
        const keysets = await this.getKeysets()
        const keysetIds = keysets.map(ks=> ks.id)
        const containsUnknownKeysetId = proofs.find(p=>!keysetIds.includes(p.id))
        if (containsUnknownKeysetId) {
            throw new MintError(100, "proofs contain unknown or disabled keyset ids")
        }
        const secrets = proofs.map(p=> p.secret)
        const containsSpentSecret = await persistence.containsSpentSecret(secrets)
        if (containsSpentSecret)  {
            throw new MintError(101, 'contains already spent proof');
        }
        const proofKeysets = [...new Set(proofs.map(p=> p.id))]
        const keys: KeysetPair[] = []
        for (const ksId of proofKeysets) {
            keys.push(await this.getKeys(ksId))
        }
        const containsInvalidProof = proofs.find(p => !verifyProof(deserializeProof(p), findPrivKeyForAmountFromKeyset(keys, p.id,p.amount)))

        if (containsInvalidProof) {
            throw new MintError(102, 'contains invalid proof');
        }
        return true
    }
}