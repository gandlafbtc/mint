import type { BlindSignature, Proof } from "@cashu/crypto/modules/common"

export class MintError extends Error {
  code: number
  detail: string
  constructor(code: number, detail: string){
    super(detail)
    this.code = code
    this.detail = detail
  }
}

export type Method = 'bolt11'

export type Unit = 'sat'


export enum Version {
    V1 = '1.0.0'
} 



export type Secret = Proof | {secret: Uint8Array}
