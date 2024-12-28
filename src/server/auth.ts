import type Elysia from "elysia";
import { db } from "../db/db";
import { settingsTable, userTable } from "../db/schema";
import { eq } from "drizzle-orm";
import { hash, verify } from "@node-rs/argon2";
import { takeUniqueOrThrow, takeUniqueOrUndefinded } from "../db/orm-helpers/orm-helper";
import { isAuthenticated } from "./middleware";
import { getAll } from "../persistence/generic";
import { upsertSettings } from "../persistence/settings";
import { SETTINGS_VERSION } from "../const";
import { testBackendConnection } from "../backend/test-connection";

export const auth = (app: Elysia) =>
        app
            .post(
                "/signup",
                async ({ body, set, jwt }) => {
                    const { password, username } = body as {username:string, password: string};
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
                },
                
            )
            .post(
                "/login",
                async ({ body, set, jwt}) => {
                    const { username, password } = body as {username:string, password: string};
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
            .get("/settings",async ({ user, message }) => {
                const settings = await getAll(settingsTable)
                return {
                    success: true,
                    message: message,
                    data: {
                        settings,
                    },
                };
            })
            .post("/updateMintSettings",async ({ user, message, body, set })=>{
                const {description,descripttionLong,iconURL,name} = body as {
                    name: string
                    description: string,
                    descripttionLong: string,
                    iconURL: string
                };
                await upsertSettings([
                    {key:'mint-name', value: name, version: SETTINGS_VERSION},
                    {key:'mint-description', value: description, version: SETTINGS_VERSION},
                    {key:'mint-description-long', value: descripttionLong, version: SETTINGS_VERSION},
                    {key:'mint-icon-url', value: iconURL, version: SETTINGS_VERSION},
                ])
                const settings = await getAll(settingsTable)
                return {
                    success: true,
                    message: message,
                    data: {
                        settings
                    },
                };
            })
            .post("/connectBackend",async ({ user, message, body, set })=>{
                const {macaroonHex, rpcHost, tlsCertHex, type } = body as {
                    type: string
                    rpcHost: string,
                    macaroonHex: string,
                    tlsCertHex: string
                };
                const {isValid, state, detail} = await testBackendConnection(rpcHost, macaroonHex, tlsCertHex)
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
                    {key:'backend-type', value: type, version: SETTINGS_VERSION},
                    {key:'backend-rpc-host', value: rpcHost, version: SETTINGS_VERSION},
                    {key:'backend-macaroon', value: macaroonHex, version: SETTINGS_VERSION},
                    {key:'backend-tls-cert', value: tlsCertHex, version: SETTINGS_VERSION},
                ])
                const settings = await getAll(settingsTable)
                return {
                    success: true,
                    message: message,
                    data: {
                        settings
                    },
                };
            })