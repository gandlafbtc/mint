import { LndClient, type LndRpcApis } from "@lightningpolar/lnd-api"
import { settingsTable } from "@mnt/common/db"
import { getAll } from "../persistence/generic"
import { testBackendConnection } from "../backend/test-connection"


export class LND {
    private static instance: LndRpcApis | undefined

    private constructor() {
    }
    public static async getInstance(): Promise<LndRpcApis> {
        if (!LND.instance) {
            const {socket , macaroon, cert} = await getLNDSettings()
            const { isValid } = await testBackendConnection(socket, macaroon, cert)
            if (!isValid) {
                throw new Error("Could not create LND instance");
            }
            LND.instance = LndClient.create({cert, macaroon, socket})
        }
        return LND.instance
    }
    public static destroyInstance() {
        LND.instance = undefined
    }
    public static async recreateInstance():  Promise<LndRpcApis>  {
        LND.destroyInstance()
        return LND.getInstance()
    }
}

export const getLNDSettings = async () => {
    const settings = await getAll(settingsTable)
    const socket = settings.find(s=>s.key==='backend-rpc-host')?.value
    const macaroon = settings.find(s=>s.key==='backend-macaroon')?.value
    const cert = settings.find(s=>s.key==='backend-tls-cert')?.value
    return {socket, macaroon, cert}
}