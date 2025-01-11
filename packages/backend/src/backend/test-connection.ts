import { LndClient } from '@lightningpolar/lnd-api';
export const testBackendConnection = async (socket: string, macaroon: string, cert:string) => {
    try {
        const client = LndClient.create({
            socket,
            macaroon,
            cert
        });
        const { state } = await client.state.getState();
        return {state, isValid: true}
    } catch (error) {
        console.error(error)
        return {isValid: false, detail: error}
    }
}