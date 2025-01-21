import { SETTINGS_VERSION } from "../../const";
import { upsertSettings } from "../../persistence/settings";
import { testBackendConnection, testNWCConnection } from "../test-connection";
import { connectBackend } from "./connect";

export const connectNWC = async (connectionString: string) => {
    const { isConnected, state, detail } = await testNWCConnection(connectionString)
    if (!isConnected) {
        throw new Error("Could not connect to nwc provider");
    }
    await upsertSettings([
        { key: 'backend-type', value: 'NWC', version: SETTINGS_VERSION },
        { key: 'backend-nwc-connection', value: connectionString, version: SETTINGS_VERSION },
    ])
    await connectBackend()
}