import { count, sum } from "drizzle-orm"
import { db } from "../db/db"
import { blindedMessagesTable } from "@mnt/common/db";
export const getBMsCounts = async () => {
    const c = await db.select({
        id: blindedMessagesTable.id,
        count: count()
    }).from(blindedMessagesTable).groupBy(blindedMessagesTable.id)
    return c
}

export const totalPromised = async () => {
    const c = await db.select({
        id: blindedMessagesTable.id,
        sum: sum(blindedMessagesTable.amount)
    }).from(blindedMessagesTable).groupBy(blindedMessagesTable.id)
    return c
}