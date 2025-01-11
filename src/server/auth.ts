import type Elysia from "elysia";
import { db } from "../db/db";
import { blindedMessagesTable, keysetsTable, proofsTable, settingsTable, userTable } from "../db/schema";
import { eq } from "drizzle-orm";
import { hash, verify } from "@node-rs/argon2";
import { takeUniqueOrThrow, takeUniqueOrUndefinded } from "../db/orm-helpers/orm-helper";
import { isAuthenticated } from "./middleware";
import { getAll } from "../persistence/generic";
import { upsertSettings } from "../persistence/settings";
import { SETTINGS_VERSION } from "../const";
import { testBackendConnection } from "../backend/test-connection";
import { mint } from "../instances/mint";
import { ensureError } from "../errors";
import { getProofsCounts, totalProofed } from "../persistence/proofs";
import { getBMsCounts, totalPromised } from "../persistence/blindedmessages";
import { eventEmitter } from "../events/emitter";
import type { SocketEventData } from "../mint/types";

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
                    console.error(err)
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
                console.error(err)
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
                console.error(err)
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
                console.error(err)
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
                let settingsToUpdateObject: {key:string, value:string, version: number}[] = [] 
                for (const setting of settingsToUpdate) {
                    settingsToUpdateObject.push({version: SETTINGS_VERSION, key: setting[0], value: setting[1]})
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
                console.error(err)
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
                const { macaroonHex, rpcHost, tlsCertHex, type } = body as {
                    type: string
                    rpcHost: string,
                    macaroonHex: string,
                    tlsCertHex: string
                };
                const { isValid, state, detail } = await testBackendConnection(rpcHost, macaroonHex, tlsCertHex)
                if (!isValid) {
                    set.status = 500
                    set
                    return {
                        success: false,
                        message: 'Could not update backend connection',
                        data: {
                            detail,
                            state
                        },
                    };
                }
                await upsertSettings([
                    { key: 'backend-type', value: type, version: SETTINGS_VERSION },
                    { key: 'backend-rpc-host', value: rpcHost, version: SETTINGS_VERSION },
                    { key: 'backend-macaroon', value: macaroonHex, version: SETTINGS_VERSION },
                    { key: 'backend-tls-cert', value: tlsCertHex, version: SETTINGS_VERSION },
                ])
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
                console.error(err)
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
                console.error(err)
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
                console.log(keysets)
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
                console.error(err)
                return {
                    success: false,
                    message: err.message,
                    data: {
                    },
                };
            }
        }).ws('/ws', {
            beforeHandle: async ({headers, request, set, jwt})=> {
                const authHeader = headers['sec-websocket-protocol']
                if (!authHeader) {
                    set.status = 401
                    return {
                        success: false,
                        message: 'Unauthorized',
                        data: {}
                    }
                }
                const { userId } = await jwt.verify(authHeader);
                if (!userId) {
                  set.status = 401;
                  return {
                    success: false,
                    message: "Unauthorized",
                    data: null,
                  };
                }
            
                const user = await db.select().from(userTable).where(eq(userTable.id, userId)).then(takeUniqueOrUndefinded);

                if (!user) {
                  set.status = 401;
                  return {
                    success: false,
                    message: "Unauthorized",
                    data: null,
                  };
                }
            },

            open: (ws) => {
                ws.subscribe('message')
                setInterval(()=> ws.send({command: 'ping', data: {}}),5000)
                eventEmitter.on('socket-event', (e: SocketEventData)=> {
                    ws.send(e)
                })
            },
            message(ws, message){
                //receiving messages
                console.log(message)
            }
        })