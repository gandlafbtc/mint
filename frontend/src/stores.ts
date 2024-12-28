import { browser } from "$app/environment";
import { goto } from "$app/navigation";
import { PUBLIC_MINT_API } from "$env/static/public";
import type { Settings } from "lucide-svelte";
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
    const logout = () => {
        store.set(undefined)
        toast.success('Logged out')
        goto('/login')
    }
    return { ...store, logout }
}

export const userLoggedIn = createUserLoggedInStore()

const createSettingsStore = () => {
    const store = writable<Setting[]>([])

    const load = async () => {
        const response = await fetch(`${PUBLIC_MINT_API}/admin/settings`, {
            headers: {
                Authorization: 'Bearer ' + get(userLoggedIn)?.access_token
            }
        });
        const data = await response.json()
        if (response.status !== 200) {
            throw new Error(response.status + ": " + data.message);
        }
        store.set(data.data.settings)
        return
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
        return response
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
        return response
    }
    const createKeys = async (seed?: string) => {
        const response = await fetch(`${PUBLIC_MINT_API}/admin/updateMintSettings`, {
            method: "POST",
            body: JSON.stringify(payload),
            headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer ' + get(userLoggedIn)?.access_token
            }
        });
        return response
    }
    
    return { ...store, load, connectBackend, updateSettings }
}

export const settings = createSettingsStore()
export type UpdatePayload = {
    name: string
    description: string,
    descripttionLong: string,
    iconURL?: string
}