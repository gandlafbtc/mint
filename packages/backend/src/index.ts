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
import { ansiColorFormatter, configure, getConsoleSink, getFileSink, getLogger } from "@logtape/logtape";
import { version } from "../package.json";
import { logger } from '@grotto/logysia'
import { log } from './logger'
import { rateLimit } from 'elysia-rate-limit'
import cron from '@elysiajs/cron'
import { checkPendingProofs } from './jobs/checkPendingProofs'

log.info`Starting MNT version ${version}...`

const app = new Elysia()
.use(logger({
    logIP: false,
    writer: {
        write: (m: string)=> {
            log.debug(m)
        }
    }
})).use(
    cron({
        name: 'jobs',
        pattern: '*/1 * * * *',
        // pattern: '*/10 * * * * *',
        run() {
            console.log('Running jobs...')
            checkPendingProofs()
        }
    })
)
.use(rateLimit({
    duration: 30000,
    max: 100
}))
.use(swagger({
        path: '/docs',
        documentation: {
            info: {
                title: 'MNT Documentation',
                version
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
                version: 'MNT-v'+version,
                motd: settings.find(s => s.key === 'mint-motd')?.value ?? '',
                description: settings.find(s => s.key === 'mint-description')?.value ?? '',
                description_long: settings.find(s => s.key === 'mint-description-long')?.value ?? '',
                nuts: {
                    "4": {
                        methods: [{
                            method: 'bolt11',
                            unit: 'sat',
                            min_amount: parseInt(settings.find(s => s.key === 'mint-min-amt')?.value ?? "0"),
                            max_amount: parseInt(settings.find(s => s.key === 'mint-max-amt')?.value ?? "0")
                        }],
                        disabled: (settings.find(s => s.key === 'minting-disabled')?.value ?? 'false') === 'true' ? true : false,
                    },
                    "5":
                    {
                        methods: [{
                            method: 'bolt11',
                            unit: 'sat',
                            min_amount: parseInt(settings.find(s => s.key === 'melt-min-amt')?.value ?? "0"),
                            max_amount: parseInt(settings.find(s => s.key === 'melt-max-amt')?.value ?? "0")
                        }],
                        disabled: (settings.find(s => s.key === 'melting-disabled')?.value ?? 'false') === 'true' ? true : false,
                    },
                    "7": {
                        supported: true
                    }
                    ,
                    "8": {
                        supported: true
                    }
                    ,
                    "9": {
                        supported: true
                    }
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
                    log.error('Error: {error}', {error})
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
                    log.error('Error: {error}', {error})
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
                    log.error('Error: {error}', {error})
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
                    log.error('Error: {error}', {error})
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
                    log.error('Error: {error}', {error})
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
                    log.error('Error: {error}', {error})
                    return {
                        detail: err.message,
                        code: 1337
                    };
                }
            })
            .post('/checkstate', async ({ body, set }) => {
                try {
                    const { Ys } = body
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
                    log.error('Error: {error}', {error})
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
                    log.error('Error: {error}', {error})
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
    .listen(Bun.env.PORT!)

log.info`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
