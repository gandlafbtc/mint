import { count, sum } from "drizzle-orm"
import { db } from "../db/db"
import { proofsTable } from "../db/schema"


export const getProofsCounts = async () => {
    const c = await db.select({
        id: proofsTable.id,
        count: count()
    }).from(proofsTable).groupBy(proofsTable.id)
    return c
}

export const totalProofed = async () => {
    const c = await db.select({
        id: proofsTable.id,
        sum: sum(proofsTable.amount)
    }).from(proofsTable).groupBy(proofsTable.id)
    return c
}