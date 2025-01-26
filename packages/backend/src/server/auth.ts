import type Elysia from "elysia";
import { db } from "../db/db";
import { blindedMessagesTable, keysetsTable, proofsTable, settingsTable, userTable } from "@mnt/common/db";
import { type PingData } from "@mnt/common/types";
import { eq } from "drizzle-orm";
import { hash, verify } from "@node-rs/argon2";
import { takeUniqueOrThrow, takeUniqueOrUndefinded } from "../db/orm-helpers/orm-helper";
import { isAuthenticated } from "./middleware";
import { getAll, getLastDay } from "../persistence/generic";
import { upsertSettings } from "../persistence/settings";
import { SETTINGS_VERSION } from "../const";
import { testBackendConnection } from "../backend/test-connection";
import { mint, persistence } from "../instances/mint";
import { ensureError } from "../errors";
import { getProofsCounts, totalProofed } from "../persistence/proofs";
import { getBMsCounts, totalPromised } from "../persistence/blindedmessages";
import { eventEmitter } from "../events/emitter";
import type { SocketEventData } from "../mint/types";
import { getLNDSettings, LND } from "../instances/lnd";
import type { ElysiaWS } from "elysia/ws";
import { updateKeyset } from "../persistence/keysets";
import type { Keyset } from "@mnt/common/db/types";
import { connectLND } from "../backend/connect/connectLND";
import { connectNWC } from "../backend/connect/connectNWC";
import { connectBackend } from "../backend/connect/connect";
import { NWCImpl } from "../backend/NWCImpl";
import { log } from "../logger";

export const auth = (app: Elysia) =>
    app
        .post(
            "/signup",
            async ({ body, set, jwt }) => {
                try {

                    const { password, username } = body as { username: string, password: string };
                    const hasUser = (await db.select().from(userTable)).length
                    if (hasUser) {
                        set.status = 400;
                        return {
                            success: false,
                            data: null,
                            message: "Already create an user",
                        };
                    }
                    // validate duplicate email address
                    const exists = await db.select().from(userTable).where(eq(userTable.username, username)).then(takeUniqueOrUndefinded);
                    if (exists) {
                        set.status = 400;
                        return {
                            success: false,
                            data: null,
                            message: "User already exists",
                        };
                    }
                    const passwordHash = await hash(password)
                    // handle password
                    const newUser = await db.insert(userTable).values({
                        passwordHash,
                        username
                    }
                    );
                    // generate access
                    const user = await db.select().from(userTable).where(eq(userTable.username, username)).then(takeUniqueOrUndefinded);
                    if (!user) {
                        set.status = 400;
                        return {
                            success: false,
                            data: null,
                            message: "Could not create user",
                        };
                    }
                    const signature = await jwt.sign({
                        userId: user.id,
                    })

                    return {
                        success: true,
                        data: {
                            user: {
                                access_token: signature,
                                id: user.id,
                                username: user.username
                            }
                        },
                        message: "Account created",

                    };
                } catch (error) {
                    set.status = 400;
                    const err = ensureError(error)
                    log.error('Error: {error}', {error})
                    return {
                        success: false,
                        message: err.message,
                        data: {
                        },
                    };
                }
            },

        )
        .post(
            "/login",
            async ({ body, set, jwt }) => {
                const { username, password } = body as { username: string, password: string };
                // verify email/username
                const user = await db.select().from(userTable).where(eq(userTable.username, username)).then(takeUniqueOrUndefinded);
                if (!user) {
                    set.status = 400;
                    return {
                        success: false,
                        data: null,
                        message: "Invalid credentials",
                    };
                }

                // verify password
                const match = await verify(user.passwordHash, password);
                if (!match) {
                    set.status = 400;
                    return {
                        success: false,
                        data: null,
                        message: "Invalid credentials",
                    };
                }

                // generate access
                const signature = await jwt.sign({
                    userId: user.id,
                })

                return {
                    success: true,
                    data: {
                        user: {
                            access_token: signature,
                            id: user.id,
                            username: user.username
                        }
                    },
                    message: "Login successful",
                };
            },
        )
        .use(isAuthenticated)
        // protected routes
        .get("/settings", async ({ user, message, set }) => {
            try {
                const settings = await getAll(settingsTable)
                return {
                    success: true,
                    message: message,
                    data: {
                        settings,
                    },
                };
            } catch (error) {
                set.status = 400;
                const err = ensureError(error)
                log.error('Error: {error}', {error})
                return {
                    success: false,
                    message: err.message,
                    data: {
                    },
                };
            }
        })
        .get("/keysets", async ({ user, message, set }) => {
            try {
                const keysets = await getAll(keysetsTable)
                return {
                    success: true,
                    message: message,
                    data: {
                        keysets,
                    },
                };
            } catch (error) {
                set.status = 400;
                const err = ensureError(error)
                log.error('Error: {error}', {error})
                return {
                    success: false,
                    message: err.message,
                    data: {
                    },
                };
            }
        })
        .get("/dashboard-data", async ({ user, message, set }) => {
            try {
                const promisesCount = await getBMsCounts()
                const proofsCount = await getProofsCounts()
                const totalPromises = await totalPromised()
                const totalProofs = await totalProofed()

                return {
                    success: true,
                    message: message,
                    data: {
                        promisesCount,
                        proofsCount,
                        totalProofs,
                        totalPromises
                    },
                };
            } catch (error) {
                set.status = 400;
                const err = ensureError(error)
                log.error('Error: {error}', {error})
                return {
                    success: false,
                    message: err.message,
                    data: {
                    },
                };
            }
        })
        .get("/proofs", async ({ user, message, set }) => {
            try {
                const proofsLast24h = await getLastDay(proofsTable)

                return {
                    success: true,
                    message: message,
                    data: {
                        proofs: proofsLast24h
                    },
                };
            } catch (error) {
                set.status = 400;
                const err = ensureError(error)
                log.error('Error: {error}', {error})
                return {
                    success: false,
                    message: err.message,
                    data: {
                    },
                };
            }
        })
        .get("/promises", async ({ user, message, set }) => {
            try {
                const promisesLast24h = await getLastDay(blindedMessagesTable)

                return {
                    success: true,
                    message: message,
                    data: {
                        messages: promisesLast24h
                    },
                };
            } catch (error) {
                set.status = 400;
                const err = ensureError(error)
                log.error('Error: {error}', {error})
                return {
                    success: false,
                    message: err.message,
                    data: {
                    },
                };
            }
        })
        .post("/updateMintSettings", async ({ user, message, body, set }) => {
            try {

                const { description, descripttionLong, iconURL, name } = body as {
                    name: string
                    description: string,
                    descripttionLong: string,
                    iconURL: string
                };
                const settingsToUpdate = body as [string, string][]
                let settingsToUpdateObject: { key: string, value: string, version: number }[] = []
                for (const setting of settingsToUpdate) {
                    settingsToUpdateObject.push({ version: SETTINGS_VERSION, key: setting[0], value: setting[1] })
                }
                await upsertSettings(
                    settingsToUpdateObject
                )
                const settings = await getAll(settingsTable)
                return {
                    success: true,
                    message: message,
                    data: {
                        settings
                    },
                };
            } catch (error) {
                set.status = 400;
                const err = ensureError(error)
                log.error('Error: {error}', {error})
                return {
                    success: false,
                    message: err.message,
                    data: {
                    },
                };
            }
        })
        .post("/connectBackend", async ({ user, message, body, set }) => {
            try {
                const { macaroonHex, rpcHost, tlsCertHex, type, nwcString } = body as {
                    type: string
                    rpcHost?: string,
                    macaroonHex?: string,
                    tlsCertHex?: string
                    nwcString?: string
                };
                if (type === 'LND') {
                    if (!macaroonHex || !rpcHost || !tlsCertHex) {
                        set.status = 500
                        return {
                            success: false,
                            message: 'Missing parameters',
                            data: {
                            },
                        };
                    }
                    await connectLND(rpcHost, macaroonHex, tlsCertHex)
                }

                else if (type === 'NWC') {
                    if (!nwcString) {
                        set.status = 500
                        return {
                            success: false,
                            message: 'Missing parameters',
                            data: {
                            },
                        };
                    }
                    await connectNWC(nwcString)
                }

                
                const settings = await getAll(settingsTable)
                return {
                    success: true,
                    message: message,
                    data: {
                        settings
                    },
                };
            } catch (error) {
                set.status = 400;
                const err = ensureError(error)
                log.error('Error: {error}', {error})
                return {
                    success: false,
                    message: err.message,
                    data: {
                    },
                };
            }
        }).post("/createKeys", async ({ user, message, body, set }) => {
            try {
                const { seed } = body as {
                    seed?: string
                };
                await mint.createKeysFromSeed(seed)
                const settings = await getAll(settingsTable)
                return {
                    success: true,
                    message: message,
                    data: {
                        settings
                    },
                };
            } catch (error) {
                set.status = 400;
                const err = ensureError(error)
                log.error('Error: {error}', {error})
                return {
                    success: false,
                    message: err.message,
                    data: {
                    },
                };
            }
        }).post("/createKeyset", async ({ user, message, body, set }) => {
            try {
                const { unit } = body as {
                    unit?: string
                };
                await mint.createKeysetPair()
                const keysets = await getAll(keysetsTable)
                return {
                    success: true,
                    message: message,
                    data: {
                        keysets
                    },
                };
            } catch (error) {
                set.status = 400;
                const err = ensureError(error)
                log.error('Error: {error}', {error})
                return {
                    success: false,
                    message: err.message,
                    data: {
                    },
                };
            }
        }).ws('/ws', {
            beforeHandle: async ({ headers, request, set, jwt }) => {
                const authHeader = headers['sec-websocket-protocol']
                log.debug`Authorizing websocket connection...`
                if (!authHeader) {
                log.warn`Authorization token not set`
                    set.status = 401
                    return {
                        success: false,
                        message: 'Unauthorized',
                        data: {}
                    }
                }
                const { userId } = await jwt.verify(authHeader);
                if (!userId) {
                log.warn`User param not found in token: ${authHeader}`

                    set.status = 401;
                    return {
                        success: false,
                        message: "Unauthorized",
                        data: null,
                    };
                }

                const user = await db.select().from(userTable).where(eq(userTable.id, userId)).then(takeUniqueOrUndefinded);

                if (!user) {
                log.warn`No such user: ${userId}`
                    set.status = 401;
                    return {
                        success: false,
                        message: "Unauthorized",
                        data: null,
                    };
                }
              log.debug`Authorized websocket: ${userId}`

            },

            open: (ws) => {
                ws.subscribe('message')
                sendPing(ws)
                setInterval(async () => {
                    sendPing(ws)
                }, 10000)
                eventEmitter.on('socket-event', (e: SocketEventData) => {
                    log.debug(`Sending socket event {e}`, {e} )
                    ws.send(e)
                })
            },
            message(ws, message: string) {
                //receiving messages
                try {
                    handleCommand(message)
                } catch (error) {
                    console.error(error)
                }
            }
        })

const sendPing = async (ws: ElysiaWS) => {
    try {
        const lightning = mint.getLightningInterface()
        if (!lightning) {
            await connectBackend()
        }
        if (!lightning) {
            throw new Error("No backend configured");
        }
        if (lightning instanceof NWCImpl) {
            ws.send({ command: 'ping', data: {backendConnection:{isConnected: true, backend: 'NWC'}} })
            return
        }
        const {detail, isConnected} = await lightning.testConnection()
        const pingData: PingData = {
            backendConnection: {
                isConnected,
                detail: detail
            }
        }
        if (isConnected) {
            const { lnBalance, simpleBalance, walletBalance } = await lightning.getBalance()
            if (lnBalance) {
                pingData.backendConnection.lnBalance = { outbound: parseInt(lnBalance.localBalance?.sat ?? '0'), inbound: parseInt(lnBalance.remoteBalance?.sat ?? '0') }
            }
            if (walletBalance) {
                pingData.backendConnection.onchainBalance = { confirmed: parseInt(walletBalance.confirmedBalance ?? '0'), confirming: parseInt(walletBalance.unconfirmedBalance ?? '0') }
            }
            if (simpleBalance) {
                pingData.backendConnection.simpleBalance = simpleBalance
            }
        }
        ws.send({ command: 'ping', data: pingData })
        // log.debug(`sent websocket ping {pingData}`, {pingData} )
    } catch (error) {
        const err = ensureError(error)
        log.warn(`websocket Ping error {error}`, {error} )
        ws.send({ command: 'ping', data: {
            isConnected: false,
            detail: err.message
        } })
    }
   
}
const handleCommand = async (message: { command: string, data: unknown }) => {
    // log.debug(`Received websocket command: {message}`, {message} )
    switch (message.command) {
        case 'update-keyset':
            const data = message.data as {keyset: Keyset}
            await updateKeyset(data.keyset)
            break;
        case 'pong':
            break;
        default:
            log.warn("Unknown websocket command {message}", {message})
            break;
    }
}