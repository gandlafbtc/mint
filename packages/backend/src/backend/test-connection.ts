import { LndClient } from '@lightningpolar/lnd-api';
import { ensureError } from '../errors';
export const testBackendConnection = async (socket: string, macaroon: string, cert:string) => {
    try {
        const client = LndClient.create({
            socket,
            macaroon,
            cert
        });
        const { state } = await client.state.getState();
        return {state, isValid: true, detail: 'CONNECTION_OK'}
    } catch (error) {
        console.error(error)
        const err = ensureError(error)
        return {isValid: false, detail: err.message, state: 'NO_CONNECTION'}
    }
}