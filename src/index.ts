import jwt from '@elysiajs/jwt'
import { Elysia } from 'elysia'
import { auth } from './server/auth'
import { cors } from '@elysiajs/cors'

const app = new Elysia()
    .group('/v1', (app) =>
        app.use(cors()).get('/info', () => 'Hello Elysia')
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