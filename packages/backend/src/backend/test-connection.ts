import { LndClient } from "@lightningpolar/lnd-api";
import { ensureError } from "../errors";

export const testBackendConnection = async (
	socket: string,
	macaroon: string,
	cert: string,
) => {
	try {
		const client = LndClient.create({
			socket,
			macaroon,
			cert,
		});
		const { balance } = await client.lightning.channelBalance();
		return {
			state: "CONNECTION_OK",
			isConnected: balance !== undefined,
			detail: "CONNECTION_OK",
		};
	} catch (error) {
		console.error(error);
		const err = ensureError(error);
		return { isConnected: false, detail: err.message, state: "NO_CONNECTION" };
	}
};
