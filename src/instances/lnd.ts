import { LndClient, type LndRpcApis } from "@lightningpolar/lnd-api"
import { settingsTable } from "../db/schema"
import { getAll } from "../persistence/generic"
import { testBackendConnection } from "../backend/test-connection"


export class LND {
    private static instance: LndRpcApis | undefined

    private constructor() {
    }
    public static async getInstance(): Promise<LndRpcApis> {
        if (!LND.instance) {
            const settings = await getAll(settingsTable)
            console.log(settings)
            const socket = settings.find(s=>s.key==='backend-rpc-host')?.value
            const macaroon = settings.find(s=>s.key==='backend-macaroon')?.value
            const cert = settings.find(s=>s.key==='backend-tls-cert')?.value
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