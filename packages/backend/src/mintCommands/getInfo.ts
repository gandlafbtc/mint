import type { Setting } from "@mnt/common/db/types"
import { getAll } from "../persistence/generic"
import { settingsTable } from "@mnt/common/db"
import type { GetInfoResponse } from "@cashu/cashu-ts"
import { version } from "bun"

export const  getInfo = async () => {
    const settings = await getAll(settingsTable) as Setting[]
    const info: GetInfoResponse = {
        contact: [],
        name: settings.find(s => s.key === 'mint-name')?.value ?? '',
        pubkey: settings.find(s => s.key === 'mint-pub-key')?.value ?? '',
        version: 'MNT-v'+version,
        motd: settings.find(s => s.key === 'mint-motd')?.value ?? '',
        description: settings.find(s => s.key === 'mint-description')?.value ?? '',
        description_long: settings.find(s => s.key === 'mint-description-long')?.value ?? '',
        nuts: {
            "4": {
                methods: [{
                    method: 'bolt11',
                    unit: 'sat',
                    min_amount: parseInt(settings.find(s => s.key === 'mint-min-amt')?.value ?? "0"),
                    max_amount: parseInt(settings.find(s => s.key === 'mint-max-amt')?.value ?? "0")
                }],
                disabled: (settings.find(s => s.key === 'minting-disabled')?.value ?? 'false') === 'true' ? true : false,
            },
            "5":
            {
                methods: [{
                    method: 'bolt11',
                    unit: 'sat',
                    min_amount: parseInt(settings.find(s => s.key === 'melt-min-amt')?.value ?? "0"),
                    max_amount: parseInt(settings.find(s => s.key === 'melt-max-amt')?.value ?? "0")
                }],
                disabled: (settings.find(s => s.key === 'melting-disabled')?.value ?? 'false') === 'true' ? true : false,
            },
            "7": {
                supported: true
            }
            ,
            "8": {
                supported: true
            }
            ,
            "9": {
                supported: true
            }
        }
    }
    return info
}