import type { ChannelBalanceResponse, InvoicePartial, Payment, PayReqStringPartial, WalletBalanceResponse } from "@lightningpolar/lnd-api";
import type { Lightning } from "../mint/interface/Lightning";
import { LND } from "../instances/lnd";
import { hexToBytes } from "@noble/hashes/utils";
import { settings } from "../mint/business/Settings";
import { randomHexString } from "../mint/util/util";
import { ensureError } from "../errors";
import { log } from "../logger";

export class LNDBackend implements Lightning {

  async testConnection(): Promise<{ state: string, detail: string, isConnected: boolean }> {
    const lnd = await LND.getInstance()
    try {
      const { balance } = await lnd.lightning.channelBalance()
      return { state: 'CONNECTION_OK', isConnected: balance===undefined?false:true, detail: 'CONNECTION_OK' }
    } catch (error) {
      console.error(error)
      const err = ensureError(error)
      return { isConnected: false, detail: err.message, state: 'NO_CONNECTION' }
    }
  }

  async getBalance(): Promise<{ lnBalance: ChannelBalanceResponse, walletBalance: WalletBalanceResponse }> {
    const lnd = await LND.getInstance()
    const lnBalance = await lnd.lightning.channelBalance()
    const walletBalance = await lnd.lightning.walletBalance()
    return {
      lnBalance,
      walletBalance
    }
  }
  async getNewInvoice(amount: number): Promise<{ paymentRequest: string, rHash: string | Buffer | Uint8Array }> {
    const lnd = await LND.getInstance()
    const invoice = await lnd.lightning.addInvoice({
      value: amount,
      expiry: settings.quoteExpiry,
    })
    return { paymentRequest: invoice.paymentRequest, rHash: invoice.rHash }
  }
  
  async getInvoice(hash: string): Promise<{ paymentRequest: string, state: string }> {
    const lnd = await LND.getInstance()
    const hashUint = hexToBytes(hash)
    const invoice = await lnd.invoices.lookupInvoiceV2({ paymentHash: hashUint })
    return invoice 
  }
    
  async getInvoiceByInvoice(invoice: string): Promise<{ paymentRequest: string, state: string }> {
    const lnd = await LND.getInstance()
    const decoded = await lnd.lightning.decodePayReq(invoice as PayReqStringPartial)
    const hashUint = hexToBytes(decoded.paymentHash)
    return await lnd.invoices.lookupInvoiceV2({ paymentHash: hashUint })
  }
  async estimateFee(request: string): Promise<{ fee: number }> {
    const lnd = await LND.getInstance()
    // const decodedRequest = await lnd.lightning.decodePayReq(request as PayReqStringPartial)
    try {
      const res = await lnd.router.estimateRouteFee({ timeout: 30, paymentRequest: request })
      if (res.failureReason !== "FAILURE_REASON_NONE") {
        const { numSatoshis } = await lnd.lightning.decodePayReq({ payReq: request })
        const amount = parseInt(numSatoshis)
        const fee = settings.feeEstBase + (Math.ceil((settings.feeEstPercent / 100) * amount))
        return { fee }

      }
      return { fee: Math.ceil(parseInt(res.routingFeeMsat) / 1000) }

    } catch (error) {
      const { numSatoshis } = await lnd.lightning.decodePayReq({ payReq: request })
      const amount = parseInt(numSatoshis)
      const fee = settings.feeEstBase + (Math.ceil((settings.feeEstPercent / 100) * amount))
      return { fee }

    }
  }

  async payInvoice(request: string, feeLimitMsat: number): Promise<{ preimage: string, fee: number }> {
    const lnd = await LND.getInstance()
    const stream = lnd.router.sendPaymentV2({ allowSelfPayment: true, feeLimitMsat, timeoutSeconds: 30, paymentRequest: request })
    return new Promise((resolve, reject) => {
      stream.on('data', (payment: Payment) => {
        switch (payment.status) {
          case 'IN_FLIGHT':
            log.info`${payment.paymentHash} payment in-flight`;
            break;
          case 'SUCCEEDED':
            log.info`${payment.paymentHash} payment successful`;

            resolve({ preimage: payment.paymentPreimage, fee: parseInt(payment.feeSat) });
            break;
          case 'FAILED':
          case 'UNKNOWN':
            log.error`${payment.paymentHash} payment failed: ${payment.failureReason}`
            reject(new Error(`${payment.paymentHash} Payment failed: ${payment.failureReason}`));
            break;
        }
      });
      stream.on('error', err => reject(err));
      stream.on('end', () => reject(new Error('Payment stream ended')));
    })
  }
  async getInvoiceAmount(request: string): Promise<{ amount: number; }> {
    const lnd = await LND.getInstance()
    const { numSatoshis } = await lnd.lightning.decodePayReq({ payReq: request })
    return { amount: parseInt(numSatoshis) }
  }
}