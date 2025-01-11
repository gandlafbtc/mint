import type { InvoicePartial } from "@lightningpolar/lnd-api"

export interface Lightning {
    getNewInvoice(amount: number): Promise<InvoicePartial>
    getInvoice(hash:string): Promise<InvoicePartial>
    payInvoice(request: string, feeLimitMsat: number): Promise<{preimage:string}>
    estimateFee(request:string): Promise<{fee: number}>
    getInvoiceAmount(request:string): Promise<{amount: number}>
}