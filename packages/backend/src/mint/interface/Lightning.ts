import type { ChannelBalanceResponse, InvoicePartial, WalletBalanceResponse } from "@lightningpolar/lnd-api"

export interface Lightning {
    getNewInvoice(amount: number): Promise<{paymentRequest: string, rHash: string | Buffer | Uint8Array}>
    getInvoice(hash:string): Promise<{paymentRequest: string, state: string}>
    getInvoiceByInvoice(invoice:string): Promise<{paymentRequest: string, state: string}>
    payInvoice(request: string, feeLimitMsat: number): Promise<{preimage:string, fee: number}>
    estimateFee(request:string): Promise<{fee: number}>
    getInvoiceAmount(request:string): Promise<{amount: number}>
    testConnection(): Promise<{state: string, detail:string, isConnected: boolean}>
    getBalance(): Promise<{lnBalance?: ChannelBalanceResponse, walletBalance?: WalletBalanceResponse, simpleBalance?: number}>
}