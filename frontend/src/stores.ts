import { browser } from "$app/environment";
import { goto } from "$app/navigation";
import { PUBLIC_MINT_API, PUBLIC_MINT_WS } from "$env/static/public";
import { scrypt } from "@noble/hashes/scrypt";
import { bytesToHex } from "@noble/hashes/utils";
import { toast } from "svelte-sonner";
import { get, writable } from "svelte/store";

export type User = {
    access_token: string
    id: string,
    username: string
}
export type Setting = {
    key: string
    value: any
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
    const store = writable<{
        hash: string;
        unit: string;
        isActive: boolean;
        allowMelt: boolean;
        allowMint: boolean;
        allowSwapOut: boolean;
        allowSwapIn: boolean;
        input_fee_ppk: number;
      }[]>([])
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


const reconnectWebSocket = () => {
    setTimeout(() => { reconnectWebSocket() }, 5000)
    const user = get(userLoggedIn)
    if (!user?.access_token) {
        return
    }
    if (socket === undefined || socket.readyState === WebSocket.CLOSED) {
        socket = new WebSocket(PUBLIC_MINT_WS, [user.access_token])
        socket.addEventListener('message', (e) => {

        })
        console.log('connect to ws')
    }
}
reconnectWebSocket()


export const init = async () => {
    await Promise.all([
        keysets.load()
    ])
} 