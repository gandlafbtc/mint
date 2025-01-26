import { CheckStateEnum, MeltQuoteState } from "@cashu/cashu-ts"
import { mint, persistence } from "../instances/mint"
import { db } from "../db/db"
import { meltQuotesTable, proofsTable } from "@mnt/common/db"
import { inArray } from "drizzle-orm"
import { log } from "../logger"

export const checkPendingProofs = async () => {
    const proofs = await persistence.getProofsByState(CheckStateEnum.PENDING)
    log.debug`check [${proofs.length}] pending proofs`
    if (!proofs.length) {
        return
    }
    const meltIds: string[] = [...new Set(proofs.map(p=>p.meltId))].filter(s=> s!==null)
    console.log(meltIds)
    const meltquotes = await db.select().from(meltQuotesTable).where(inArray(meltQuotesTable.quote, meltIds))
    log.debug`check [${meltquotes.length}] quotes for proofs`
    const deleteProofIds: string[] = []
    for (const q of meltquotes) {
        const invoice = await mint.getLightningInterface()?.getInvoiceByInvoice(q.request)
        console.log(invoice)
        if  (invoice?.state==='SETTLED') {
            const settledProofs = proofs.filter(p=>p.meltId===q.quote)
            await persistence.updateProofStatus(settledProofs.map(p=>p.secret), CheckStateEnum.SPENT)
            await persistence.updateMeltQuoteState(q.quote, MeltQuoteState.PAID)
            log.info`[${settledProofs.length}] proofs have been settled for mint quote [${q.quote}]`
        }
        if  (invoice?.state==='FAILED' || invoice?.state==='CANCELED') {
            const failedProofs = proofs.filter(p=>p.meltId===q.quote)
            await db.delete(proofsTable).where(inArray(proofsTable.uid, failedProofs.map(p=>p.uid)))            
            await persistence.updateMeltQuoteState(q.quote, "FAILED")
            log.info`[${failedProofs.length}] proofs have failed to settle for mint quote [${q.quote}] and were removed from the db`
        }
    }
}  