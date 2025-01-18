import jwt from '@elysiajs/jwt'
import { Elysia, t } from 'elysia'
import { auth } from './server/auth'
import { cors } from '@elysiajs/cors'
import { swagger } from '@elysiajs/swagger'
import { getAll } from './persistence/generic'
import { keysetsTable, settingsTable } from '@mnt/common/db'
import { CheckStateEnum, type GetInfoResponse, type MintKeyset, type SerializedBlindedMessage } from '@cashu/cashu-ts'
import type { SerializedProof } from '@cashu/crypto/modules/common';

import { getActiveKeys, getKeysetById } from './persistence/keysets'
import { mint, persistence } from './instances/mint'
import { ensureError } from './errors'
import type { Keyset, Setting } from '@mnt/common/db/types'

const app = new Elysia()
    .use(swagger({
        path: '/docs',
        documentation: {
            info: {
                title: 'MNT Documentation',
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
                version: 'MNT-v0.1',
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
                    const change = await mint.getChange(quote)
                    return {
                        quote: q, amount, fee_reserve, state, expiry, payment_preimage, change: change.map(c => { return { C_: c.C_, id: c.id, amount: c.amount } })
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
            .post('/melt/quote/bolt11', async ({ body, set }) => {
                try {
                    const { unit, request } = body as { unit: string, request: string }

                    const { quote: q, amount, fee_reserve, state, expiry, payment_preimage } = await mint.meltQuote(request, unit)
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
            .post('/melt/bolt11', async ({ body, set }) => {
                try {
                    const { quote, inputs, outputs } = body as { quote: string, inputs: SerializedProof[], outputs?: SerializedBlindedMessage[] }
                    const updatedQuote = await mint.melt(quote, inputs, outputs)
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
            .post('/checkstate', async ({ body, set }) => {
                try {
                    const { Ys } = body as { Ys: string[] }
                    const states = await mint.checkToken(Ys)
                    for (const y of Ys) {
                        if (!states.find(s => s.Y === y)) {
                            states.push({ Y: y, state: CheckStateEnum.UNSPENT })
                        }
                    }
                    return { states }
                } catch (error) {
                    set.status = 400;
                    const err = ensureError(error)
                    console.error(err)
                    return {
                        detail: err.message,
                        code: 1337
                    };
                }
            }//Schema
                , {
                    body: t.Object({
                        Ys: t.Array(t.String())
                    }),
                    response:
                    {
                        400: t.Object({
                            code: t.Number(),
                            detail: t.String()
                        }),
                        200: t.Object({
                            states: t.Array(t.Object({
                                Y: t.String(),
                                state: t.String()
                            }))
                        })

                    }
                }
            )
            .post('/restore', async ({ body, set }) => {
                try {
                    const { outputs } = body
                    const restoredOutputs = await mint.restore(outputs)
                    return restoredOutputs
                } catch (error) {
                    set.status = 400;
                    const err = ensureError(error)
                    console.error(err)
                    return {
                        detail: err.message,
                        code: 1337
                    };
                }
            }
                //Schema
                , {
                    body: t.Object({
                        outputs: t.Array(t.Object({
                            amount: t.Number(),
                            id: t.String(),
                            B_: t.String(),
                        }))
                    }),
                    response:
                    {
                        400: t.Object({
                            code: t.Number(),
                            detail: t.String()
                        }),
                        200:
                            t.Object({
                                outputs: t.Array(t.Object({
                                    amount: t.Number(),
                                    id: t.String(),
                                    B_: t.String(),
                                })),
                                signatures: t.Array(t.Object({
                                    amount: t.Number(),
                                    id: t.String(),
                                    C_: t.String(),
                                })),
                                promises: t.Array(t.Object({
                                    amount: t.Number(),
                                    id: t.String(),
                                    C_: t.String(),
                                }))
                            }
                            )
                    }
                }
            )
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