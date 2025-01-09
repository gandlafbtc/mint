import type { KeysetPair } from '@cashu/crypto/modules/mint';
import type { Method, Secret, Unit } from '../types';
import type { BlindSignature, Keyset, Proof, SerializedBlindedMessage, SerializedBlindSignature, SerializedProof } from '@cashu/crypto/modules/common';
import type { MeltQuote, MintQuote } from '../../db/schema';


export interface Mint {
    // NUT 01
    createKeysetPair(): Promise<KeysetPair>
    getKeys(keysetIds?: string): Promise<KeysetPair>
    
    // NUT 02
    getKeysets(): Promise<Keyset[]>

    // NUT 03
    swap(inputs: SerializedProof[], outputs: SerializedBlindedMessage[]): Promise<SerializedBlindSignature[]>

    // NUT 04
    mintQuote(amount: number, method: Method, unit: Unit): Promise<MintQuote>
    getMintQuote(quote:string): Promise<MintQuote>
    mint(quote: string, outputs: SerializedBlindedMessage[]): Promise<SerializedBlindSignature[]> 

    // NUT 05 & NUT 08
    meltQuote(request: string, unit: Unit): Promise<MeltQuote>
    getMeltQuote(quote:string): Promise<MeltQuote>
    melt(quote: string, inputs: SerializedProof[], outputs?: SerializedBlindedMessage[]): Promise<MeltQuote & {signatures?: SerializedBlindSignature[]}>

    // NUT 07
    checkToken(proofs: Secret[]): Promise<{spendable: boolean[], pending: boolean[]}>
}