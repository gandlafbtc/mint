import { nwc } from "@getalby/sdk";
import { SETTINGS_VERSION } from "../../const";
import { upsertSettings } from "../../persistence/settings";
import { connectBackend } from "./connect";

export const connectNWC = async (connectionString: string) => {
    const instance = new nwc.NWCClient({
        nostrWalletConnectUrl: connectionString
    })
    await upsertSettings([
        { key: 'backend-type', value: 'NWC', version: SETTINGS_VERSION },
        { key: 'backend-nwc-connection', value: connectionString, version: SETTINGS_VERSION },
    ])
    await connectBackend()
}