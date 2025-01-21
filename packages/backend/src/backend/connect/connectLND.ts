import { SETTINGS_VERSION } from "../../const";
import { upsertSettings } from "../../persistence/settings";
import { testBackendConnection } from "../test-connection";
import { connectBackend } from "./connect";

export const connectLND = async (rpcHost: string, macaroonHex: string, tlsCertHex: string) => {
    const { isConnected, state, detail } = await testBackendConnection(rpcHost, macaroonHex, tlsCertHex)
    if (!isConnected) {
        throw new Error("Could not connect to LND: "+ detail, );
    }
    await upsertSettings([
        { key: 'backend-type', value: 'LND', version: SETTINGS_VERSION },
        { key: 'backend-rpc-host', value: rpcHost, version: SETTINGS_VERSION },
        { key: 'backend-macaroon', value: macaroonHex, version: SETTINGS_VERSION },
        { key: 'backend-tls-cert', value: tlsCertHex, version: SETTINGS_VERSION },
    ])
    await connectBackend()
}