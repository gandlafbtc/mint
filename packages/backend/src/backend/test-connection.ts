import { LndClient } from '@lightningpolar/lnd-api';
import { ensureError } from '../errors';
import { randomHexString } from '../mint/util/util';
import { nwc } from '@getalby/sdk';

export const testBackendConnection = async (socket: string, macaroon: string, cert:string) => {
    try {
        const client = LndClient.create({
            socket,
            macaroon,
            cert
        });
        const { balance } = await client.lightning.channelBalance()
        return {state: 'CONNECTION_OK', isConnected: balance===undefined?false:true , detail: 'CONNECTION_OK'}
    } catch (error) {
        console.error(error)
        const err = ensureError(error)
        return {isConnected: false, detail: err.message, state: 'NO_CONNECTION'}
    }
}

export const testNWCConnection = async (connectionString: string) => {
    try {
        const client = new nwc.NWCClient({
            nostrWalletConnectUrl: connectionString
        });
        const { network }= await client.getInfo()
        const connected = client.connected
        return {state: 'CONNECTION_OK', isConnected: connected, detail: 'CONNECTION_OK'}
    } catch (error) {
        console.error(error)
        const err = ensureError(error)
        return {isConnected: false, detail: err.message, state: 'NO_CONNECTION'}
    }
}