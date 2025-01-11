import { browser } from "$app/environment";
import { goto } from "$app/navigation";
import { PUBLIC_MINT_API, PUBLIC_MINT_WS } from "$env/static/public";
import { scrypt } from "@noble/hashes/scrypt";
import { bytesToHex } from "@noble/hashes/utils";
import { toast } from "svelte-sonner";
import { get, writable } from "svelte/store";
import { type BlindedMessage, type Keyset, type Proof, type Setting } from "@mnt/common/db/types";

export type User = {
    access_token: string
    id: string,
    username: string
}


export let socket: undefined | WebSocket

const createUserLoggedInStore = () => {
    const defaultValueString = browser ? localStorage.getItem('user') ?? undefined : undefined
    let defaultValue: User | undefined = undefined
    if (defaultValueString) {
        if (defaultValueString !== 'undefined') {
            defaultValue = JSON.parse(defaultValueString)
        }
    }
    const store = writable<User | undefined>(defaultValue)

    store.subscribe((value) => {
        if (browser) {
            if (!value) {
                localStorage.setItem('user', '')
            }
            localStorage.setItem('user', JSON.stringify(value))
        }
    })
    const signup = async (username: string, password: string) => {
        const pwHash = bytesToHex(
            scrypt(password, 'saltynuts', { N: 2 ** 16, r: 8, p: 1, dkLen: 32 })
        );
        const response = await fetch(`${PUBLIC_MINT_API}/admin/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username,
                password
                    : pwHash
            })
        });
        const data = await response.json()
        if (!data.success) {
            throw new Error(data.message);
        }
        userLoggedIn.set(data.data.user)
		await init()
        socket = new WebSocket(PUBLIC_MINT_WS, [data.data.user.access_token])
        return data
    }
    const login = async (username: string, password: string) => {
        const pwHash = bytesToHex(
            scrypt(password, 'saltynuts', { N: 2 ** 16, r: 8, p: 1, dkLen: 32 })
        );
        let response = await fetch(`${PUBLIC_MINT_API}/admin/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username,
                password
                    : pwHash
            })
        });
        const data = await response.json()
        if (!data.success) {
            throw new Error(data.message);
        }
        userLoggedIn.set(data.data.user)
		await init()
        socket = new WebSocket(PUBLIC_MINT_WS, [data.data.user.access_token])
        return data
    }

    const logout = () => {
        store.set(undefined)
        socket?.close()
        toast.success('Logged out')
        goto('/login')
    }
    return { ...store, logout, login, signup }
}

export const userLoggedIn = createUserLoggedInStore()

const createSettingsStore = () => {
    const store = writable<Setting[]>([])
    const setFromResponse = async (response: Response) => {
        const data = await response.json()
        if (response.status !== 200) {
            throw new Error(response.status + ": " + data.message);
        }
        store.set(data.data.settings)
        return data.data.settings
    }
    const load = async () => {
        const response = await fetch(`${PUBLIC_MINT_API}/admin/settings`, {
            headers: {
                Authorization: 'Bearer ' + get(userLoggedIn)?.access_token
            }
        });
        if (response.ok) {
            return await setFromResponse(response)
        }
        else {
            throw new Error("Could not load settings");
        }
    }
    type ConnectPayload = {
        type: string
        rpcHost: string,
        macaroonHex: string,
        tlsCertHex: string
    }
    const connectBackend = async (payload: ConnectPayload) => {
        const response = await fetch(`${PUBLIC_MINT_API}/admin/connectBackend`, {
            method: "POST",
            body: JSON.stringify(payload),
            headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer ' + get(userLoggedIn)?.access_token
            }
        });
        if (response.ok) {
            return await setFromResponse(response)
        }
        else {
            throw new Error("Could not load settings");
        }
    }
    const updateSettings = async (payload: UpdatePayload) => {
        const response = await fetch(`${PUBLIC_MINT_API}/admin/updateMintSettings`, {
            method: "POST",
            body: JSON.stringify(payload),
            headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer ' + get(userLoggedIn)?.access_token
            }
        });
        if (response.ok) {
            return await setFromResponse(response)
        }
        else {
            throw new Error("Could not load settings");
        }
    }
    const createKeys = async (seed?: string) => {
        const response = await fetch(`${PUBLIC_MINT_API}/admin/createKeys`, {
            method: "POST",
            body: JSON.stringify({ seed }),
            headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer ' + get(userLoggedIn)?.access_token
            }
        });
        if (response.ok) {
            return await setFromResponse(response)
        }
        else {
            throw new Error("Could not load settings");
        }
    }

    
    return { ...store, load, connectBackend, updateSettings, createKeys }
}



export const settings = createSettingsStore()
export type UpdatePayload = [string, string][]

const createKeysetsStore = () => {
    const store = writable<Keyset[]>([])
    const setFromResponse = async (response: Response) => {
        const data = await response.json()
        if (response.status !== 200) {
            throw new Error(response.status + ": " + data.message);
        }
        store.set(data.data.keysets)
        return data.data.keysets
    }
    const createKeyset = async (options: { unit?: string }) => {
        const response = await fetch(`${PUBLIC_MINT_API}/admin/createKeyset`, {
            method: "POST",
            body: JSON.stringify({ unit: options.unit }),
            headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer ' + get(userLoggedIn)?.access_token
            }
        });
        return await setFromResponse(response)
    }
    const load = async () => {
        const response = await fetch(`${PUBLIC_MINT_API}/admin/keysets`, {
            headers: {
                Authorization: 'Bearer ' + get(userLoggedIn)?.access_token
            }
        });
        if (response.ok) {
            return await setFromResponse(response)
        }
        else {
            throw new Error("Could not load keysets");
        }
    }
    return { ...store, load, createKeyset }
}

export const keysets = createKeysetsStore()


const createDashboardDataStore = () => {
    const store = writable<{
        promisesCount: {id: string, count: number}[],
        proofsCount: {id: string, count: number}[],
        totalProofs: {id: string, sum: string}[],
        totalPromises: {id: string, sum: string}[]
    }>()
    const setFromResponse = async (response: Response) => {
        const data = await response.json()
        if (response.status !== 200) {
            throw new Error(response.status + ": " + data.message);
        }
        console.log(data)
        store.set(data.data)
        return data.data
    }
    
    const load = async () => {
        const response = await fetch(`${PUBLIC_MINT_API}/admin/dashboard-data`, {
            headers: {
                Authorization: 'Bearer ' + get(userLoggedIn)?.access_token
            }
        });
        if (response.ok) {
            return await setFromResponse(response)
        }
        else {
            throw new Error("Could not load keysets");
        }
    }
    return { ...store, load }
}

export const dashboardData = createDashboardDataStore()


const createProofsStore = () => {
    const store = writable<Proof[]>([])
    const setFromResponse = async (response: Response) => {
        const data = await response.json()
        if (response.status !== 200) {
            throw new Error(response.status + ": " + data.message);
        }
        console.log(data)
        store.set(data.data.proofs)
        return data.data
    }
    
    const load = async () => {
        const response = await fetch(`${PUBLIC_MINT_API}/admin/proofs`, {
            headers: {
                Authorization: 'Bearer ' + get(userLoggedIn)?.access_token
            }
        });
        if (response.ok) {
            return await setFromResponse(response)
        }
        else {
            throw new Error("Could not load proofs");
        }
    }
    return { ...store, load }
}

export const proofsStore = createProofsStore()


const createPromisesStore = () => {
    const store = writable<BlindedMessage[]>([])
    const setFromResponse = async (response: Response) => {
        const data = await response.json()
        if (response.status !== 200) {
            throw new Error(response.status + ": " + data.message);
        }
        console.log(data)
        store.set(data.data.messages)
        return data.data
    }
    
    const load = async () => {
        const response = await fetch(`${PUBLIC_MINT_API}/admin/promises`, {
            headers: {
                Authorization: 'Bearer ' + get(userLoggedIn)?.access_token
            }
        });
        if (response.ok) {
            return await setFromResponse(response)
        }
        else {
            throw new Error("Could not load proofs");
        }
    }
    return { ...store, load }
}

export const promisesStore = createPromisesStore()



const handleSocketCommand = (data: {command: string, data: any}) => {
    if (!data.command || data.command === 'ping') {
        return
    }
    switch (data.command) {
        case 'inserted-messages':
            const messages = data.data.messages as BlindedMessage[]
            if (!messages.length) {
                return
            }
            promisesStore.update(ctx=> [...ctx, ...messages])
            dashboardData.update(ctx=> {
                for (const message of messages) {
                    const count = ctx.promisesCount.find(c=> c.id===message.id)
                    if (!count) {
                        continue
                    }
                    count.count++
                    const sum = ctx.totalPromises.find(c=> c.id===message.id)
                    if (!sum) {
                        continue
                    }
                    sum.sum = (parseInt(sum.sum) + message.amount) + ''
                }
                return ctx 
            })
            break;
        case 'inserted-proofs':
            const proofs = data.data.proofs as Proof[]
            if (!proofs.length) {
                return
            }
            proofsStore.update(ctx=> [...ctx, ...proofs])
            dashboardData.update(ctx=> {
                for (const proof of proofs) {
                    const count = ctx.proofsCount.find(c=> c.id===proof.id)
                    if (!count) {
                        continue
                    }
                    count.count++
                    const sum = ctx.totalProofs.find(c=> c.id===proof.id)
                    if (!sum) {
                        continue
                    }
                    sum.sum = (parseInt(sum.sum) + proof.amount) + ''
                }
                return ctx 
            })
            break;
        default:
            console.log('unknown command: ', data.command);
    }
}

const handleSocketMessage = (message: MessageEvent) => {
    const dataStr = message.data
    if (!dataStr) {
        return
    }
    let data
    try {
        data = JSON.parse(dataStr)
    } catch (error) {
        console.error('could not parse JSON: ' , dataStr)
    }
    handleSocketCommand(data)
}

const reconnectWebSocket = () => {
    if (!browser)
    {
        return
    }
    setTimeout(() => { reconnectWebSocket() }, 5000)
    const user = get(userLoggedIn)
    if (!user?.access_token) {
        return
    }
    if (socket === undefined || socket.readyState === WebSocket.CLOSED) {
        socket = new WebSocket(PUBLIC_MINT_WS, [user.access_token])
        socket.onopen = () => {
            socket?.send('pong') // send some text to server
          };
          socket.onmessage = (message) => {
            // here we got something sent from the server
            handleSocketMessage(message)
          };
        console.log('connect to ws')
    }
}
reconnectWebSocket()


export const init = async () => {
    await Promise.all([
        keysets.load(),
        dashboardData.load(),
        proofsStore.load(),
        promisesStore.load()
    ])
} 