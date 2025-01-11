import type { InvoicePartial, Payment, PayReqStringPartial } from "@lightningpolar/lnd-api";
import type { Lightning } from "../mint/interface/Lightning";
import { LND } from "../instances/lnd";
import { hexToBytes } from "@noble/hashes/utils";
import { settings } from "../mint/business/Settings";

export class LNDBackend implements Lightning {
    async getNewInvoice(amount: number): Promise<InvoicePartial> {
        const lnd = await LND.getInstance()
        return await lnd.lightning.addInvoice({
            value: amount,
            expiry: settings.quoteExpiry,
        })
    }
    async getInvoice(hash: string): Promise<InvoicePartial> {
        const lnd = await LND.getInstance()
        const hashUint = hexToBytes(hash)
        return await lnd.invoices.lookupInvoiceV2({paymentHash: hashUint})
    }
    async estimateFee(request: string): Promise<{fee: number}> {
        const lnd = await LND.getInstance()
        // const decodedRequest = await lnd.lightning.decodePayReq(request as PayReqStringPartial)
        const res = await lnd.router.estimateRouteFee({timeout: 30, paymentRequest: request})
        if (res.failureReason !== "FAILURE_REASON_NONE") {
          const {numSatoshis} =await lnd.lightning.decodePayReq({payReq: request})
          const amount = parseInt(numSatoshis)
          const fee = settings.feeEstBase + (Math.ceil((settings.feeEstPercent/100)* amount))  
          return {fee}
                       
        }
        return {fee: Math.ceil(parseInt(res.routingFeeMsat)/1000)}
    }
    
    async payInvoice(request: string, feeLimitMsat: number): Promise<{ preimage: string; }> {
        const lnd = await LND.getInstance()
        const stream = lnd.router.sendPaymentV2({allowSelfPayment: true, feeLimitMsat, timeoutSeconds:30, paymentRequest: request})
        return new Promise((resolve, reject) => {
            stream.on('data', (payment: Payment) => {
              switch (payment.status) {
                case 'IN_FLIGHT':
                  console.log('payInvoice payment in-flight');
                  break;
                case 'SUCCEEDED':
                  console.log('payInvoice payment completed');

                  resolve({preimage: payment.paymentPreimage});
                  break;
                case 'FAILED':
                case 'UNKNOWN':
                  console.log(
                    `payInvoice payment failed: ${payment.failureReason}`,
                  );
                  reject(new Error(`Payment failed: ${payment.failureReason}`));
                  break;
              }
            });
            stream.on('error', err => reject(err));
            stream.on('end', () => reject(new Error('Payment stream ended')));
        })
    }
    async getInvoiceAmount(request: string): Promise<{ amount: number; }> {
        const lnd = await LND.getInstance()
        console.log(request)
        const {numSatoshis} =await lnd.lightning.decodePayReq({payReq: request})
        return {amount: parseInt(numSatoshis)}
    }
}