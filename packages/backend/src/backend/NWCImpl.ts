import type { Lightning } from "../mint/interface/Lightning";
import { settings } from "../mint/business/Settings";
import { NWC } from "../instances/nwc";
import { decode } from "light-bolt11-decoder";
import type { ChannelBalanceResponse } from "@lightningpolar/lnd-api";
import { ensureError } from "../errors";

export class NWCImpl implements Lightning {

  async testConnection(): Promise<{ state: string; detail: string, isConnected: boolean }> {
      try {
        const client = await NWC.getInstance()
        const { network }= await client.getInfo()
        
        const connected = client.connected
        return {state: 'CONNECTION_OK', isConnected: connected, detail: 'CONNECTION_OK'}
    } catch (error) {
        console.error(error)
        const err = ensureError(error)
        return {isConnected: false, detail: err.message, state: 'NO_CONNECTION'}
    }
  }

  async getBalance(): Promise<{simpleBalance: number}> {
    const nwc = await NWC.getInstance()
    const {balance} = await nwc.getBalance()
    return {simpleBalance: balance}
  }

  async getNewInvoice(amount: number): Promise<{paymentRequest: string, rHash: string| Buffer | Uint8Array}> {
    const nwc = await NWC.getInstance()
    const tx = await nwc.makeInvoice({amount: amount*1000})
    return {paymentRequest: tx.invoice, rHash: tx.payment_hash}
  }

  async getInvoice(hash: string): Promise<{paymentRequest: string, state: string}> {
    const nwc = await NWC.getInstance()
    const tx = await nwc.lookupInvoice({
      payment_hash: hash
    })
    console.log(tx)
    return {paymentRequest: tx.invoice, state: tx.state.toUpperCase()}
  }
  async getInvoiceByInvoice(invoice: string): Promise<{paymentRequest: string, state: string}> {
    const nwc = await NWC.getInstance()
    const tx = await nwc.lookupInvoice({
      invoice: invoice
    })
    console.log(tx)
    return {paymentRequest: tx.invoice, state: tx.state.toUpperCase()}
  }

  async estimateFee(request: string): Promise<{ fee: number }> {
    const invoice = decode(request)
    const amount = invoice.sections[2].value as number
    if (!amount || isNaN(amount)) {
      return {fee: 1}
    }
    const fee = settings.feeEstBase + (Math.ceil((settings.feeEstPercent / 100) * (amount/1000)))
    return {fee}
  }

  async payInvoice(request: string, feeLimitMsat: number): Promise<{ preimage: string, fee: number }> {
    const nwc = await NWC.getInstance()

    const { preimage } = await nwc.payInvoice({
      invoice: request,
    })
    const { fees_paid } =  await nwc.lookupInvoice({
      invoice: request
    })
    return {preimage, fee: fees_paid }
  }
  
  async getInvoiceAmount(request: string): Promise<{ amount: number; }> {
    const invoice = decode(request)
    const amount = invoice.sections[2].value /1000 as number
    return {amount}
  }

}