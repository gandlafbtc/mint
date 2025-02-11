import { settingsTable } from "@mnt/common/db"
import { getAll } from "../persistence/generic"
import { nwc } from "@getalby/sdk";

export class NWC {
    private static instance: nwc.NWCClient | undefined

    private constructor() {
    }
    public static async getInstance(): Promise<nwc.NWCClient> {
        if (!NWC.instance) {
            const { connectionString } = await getNWCSettings()
            const nwcInstance = new nwc.NWCClient({
                nostrWalletConnectUrl: connectionString
            })
            NWC.instance = nwcInstance
        }
        return NWC.instance
    }
    
    public static destroyInstance() {
        NWC.instance = undefined
    }
    public static async recreateInstance():  Promise<nwc.NWCClient>  {
        NWC.destroyInstance()
        return NWC.getInstance()
    }
}

export const getNWCSettings = async () => {
    const settings = await getAll(settingsTable)
    const connectionString = settings.find(s=>s.key==='backend-nwc-connection')?.value
    return { connectionString }
}