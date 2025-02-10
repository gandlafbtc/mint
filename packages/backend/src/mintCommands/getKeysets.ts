import type { Keyset } from "@mnt/common/db/types"
import { getAll } from "../persistence/generic"
import type { MintKeyset } from "@cashu/cashu-ts"
import { keysetsTable } from "@mnt/common/db"

export const getKeysets = async () => {
    const storedKeysets = await getAll(keysetsTable) as Keyset[]
    const keysets: MintKeyset[] = storedKeysets.map(ks => {
        return {
            active: ks.isActive ?? false,
            id: ks.hash,
            unit: ks.unit ?? 'sat',
            input_fee_ppk: ks.input_fee_ppk ?? 0
        }
    })
    return { keysets }
}