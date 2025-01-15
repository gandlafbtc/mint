export type PingData = {
    backendConnection: {
        isConnected: boolean,
        detail: string
        lnBalance?: {
            inbound: number,
            outbound: number,
        }
        onchainBalance?: {
            confirmed: number,
            confirming: number
        }
    }
}

export type ConnectPayload = {
    type: string
    rpcHost: string,
    macaroonHex: string,
    tlsCertHex: string
}

export type GeneralSettings = {
	mintName: string
	mintDescription: string
	mintIconUrl: string
	mintDescriptionLong: string
}