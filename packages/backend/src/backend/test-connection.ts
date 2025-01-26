import { LndClient } from '@lightningpolar/lnd-api';
import { ensureError } from '../errors';
import { nwc } from '@getalby/sdk';
import { log } from '../logger';

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

// export const testNWCConnection = async (connectionString: string, instance: nwc.NWCClient) => {
//     try {
//         log.debug`testing nwc connection: ${connectionString}`
//         await instance.getInfo()
//         return {state: 'CONNECTION_OK', isConnected: true, detail: 'CONNECTION_OK'}
//     } catch (error) {
//         console.error(error)
//         const err = ensureError(error)
//         return {isConnected: false, detail: err.message, state: 'NO_CONNECTION'}
//     }
// }