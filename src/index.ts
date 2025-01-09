import jwt from '@elysiajs/jwt'
import { Elysia } from 'elysia'
import { auth } from './server/auth'
import { cors } from '@elysiajs/cors'
import { swagger } from '@elysiajs/swagger'
import { getAll } from './persistence/generic'
import { keysetsTable, settingsTable, type Keyset, type Setting } from './db/schema'
import type { GetInfoResponse, MintKeyset, SerializedBlindedMessage } from '@cashu/cashu-ts'
import type { SerializedProof } from '@cashu/crypto/modules/common';

import { getActiveKeys, getKeysetById } from './persistence/keysets'
import { mint } from './instances/mint'
import { ensureError } from './errors'

const app = new Elysia()
    .use(swagger({
        path: '/docs',
        documentation: {
            info: {
                title: 'BingBong Documentation',
                version: '1.0.0'
            }
        }
    }))
    .group('/v1', (app) =>
        app.use(cors()).get('/info', async () => {
            const settings = await getAll(settingsTable) as Setting[]
            const info: GetInfoResponse = {
                contact: [],
                name: settings.find(s => s.key === 'mint-name')?.value ?? '',
                pubkey: settings.find(s => s.key === 'mint-pub-key')?.value ?? '',
                version: 'bing-bong-v0.1',
                motd: settings.find(s => s.key === 'mint-motd')?.value ?? '',
                description: settings.find(s => s.key === 'mint-description')?.value ?? '',
                description_long: settings.find(s => s.key === 'mint-description-long')?.value ?? '',
                nuts: {
                    "4": {
                        methods: [{
                            method: 'bolt11',
                            unit: 'sat',
                            min_amount: 0,
                            max_amount: 0
                        }],
                        disabled: false
                    },
                    "5":
                    {
                        methods: [{
                            method: 'bolt11',
                            unit: 'sat',
                            min_amount: 0,
                            max_amount: 0
                        }],
                        disabled: false
                    },
                }
            }
            return info
        }).get('/keysets', async () => {
            const storedKeysets = await getAll(keysetsTable) as Keyset[]
            const keysets: MintKeyset[] = storedKeysets.map(ks => {
                return {
                    active: ks.isActive ?? false,
                    id: ks.hash,
                    unit: ks.unit ?? 'sat',
                    input_fee_ppk: ks.input_fee_ppk ?? 0
                }
            })
            return { keysets }
        }
        )
            .get('/keys', async () => {
                let activeKeys = await getActiveKeys()
                return { keysets: activeKeys }
            }
            ).get('/keys/:id', async ({ params: { id } }) => {
                let keysets = await getKeysetById(id)
                return { keysets: keysets }
            }
            )
            .get('/mint/quote/bolt11/:quote', async ({ params: { quote } }) => {
                const {
                    quote: q,
                    request,
                    state,
                    expiry
                } = await mint.getMintQuote(quote)
                return {
                    quote: q,
                    request,
                    state,
                    expiry
                }
            })
            .post('/mint/quote/bolt11', async ({ body, set }) => {
                try {
                    const { amount, unit, description } = body as {
                        amount: number;
                        unit?: string;
                        description?: string;
                        // pubkey?: string;
                    }
                    const {
                        quote,
                        request,
                        state,
                        expiry
                    } = await mint.mintQuote(amount, "bolt11", 'sat')
                    return { quote, request, state, expiry }
                } catch (error) {
                    set.status = 400;
                    const err = ensureError(error)
                    console.error(err)
                    return {
                        detail: err.message,
                        code: 1337
                    };
                }
            })
            .post('/mint/bolt11', async ({ body, set }) => {
                try {
                    const { outputs, quote } = body as {
                        outputs: SerializedBlindedMessage[];
                        quote: string;
                    }
                    const signatures = await mint.mint(quote, outputs)
                    return { signatures }
                } catch (error) {
                    set.status = 400;
                    const err = ensureError(error)
                    console.error(err)
                    return {
                        detail: err.message,
                        code: 1337
                    };
                }
            })
            .post('/swap', async ({ body, set }) => {
                try {
                    const { outputs, inputs } = body as {
                        outputs: SerializedBlindedMessage[];
                        inputs: SerializedProof[];
                    }
                    const signatures = await mint.swap(inputs, outputs)
                    return { signatures }
                } catch (error) {
                    set.status = 400;
                    const err = ensureError(error)
                    console.error(err)
                    return {
                        detail: err.message,
                        code: 1337
                    };
                }
            })
            .get('/melt/quote/bolt11/:quote', async ({ params: { quote }, set }) => {
                try {
                    const { quote: q, amount, fee_reserve, state, expiry, payment_preimage } = await mint.getMeltQuote(quote)
                    return {
                        quote: q, amount, fee_reserve, state, expiry, payment_preimage
                    }
                } catch (error) {
                    set.status = 400;
                    const err = ensureError(error)
                    console.error(err)
                    return {
                        detail: err.message,
                        code: 1337
                    };
                }
            })
            .post('/melt/quote/bolt11', async ({body, set}) => {
                try {
                    const {unit, request} = body as {unit: string, request:string}

                    const { quote: q, amount, fee_reserve, state, expiry, payment_preimage } = await mint.meltQuote(request,unit)
                    return {
                        quote: q, amount, fee_reserve, state, expiry, payment_preimage
                    }
                } catch (error) {
                    set.status = 400;
                    const err = ensureError(error)
                    console.error(err)
                    return {
                        detail: err.message,
                        code: 1337
                    };
                }
            })
            .post('/melt/bolt11', async ({body, set}) => {
                try {
                    const {quote, inputs} = body as {quote: string, inputs: SerializedProof[]}
                    const updatedQuote = await mint.melt(quote, inputs)
                    return updatedQuote
                } catch (error) {
                    set.status = 400;
                    const err = ensureError(error)
                    console.error(err)
                    return {
                        detail: err.message,
                        code: 1337
                    };
                }
            })
    )
    .use(cors({
        // origin: /.*\.saltyaom\.com$/
        origin: process.env.FRONTEND_URL,
    }))
    .group("/admin", (app) =>
        app
            .use(
                jwt({
                    name: "jwt",
                    secret: Bun.env.JWT_SECRET!,
                    exp: '7d'
                })
            )
            .use(auth)
    )
    .listen(3000)

console.log(
    `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
)