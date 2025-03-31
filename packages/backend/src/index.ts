import { cors } from "@elysiajs/cors";
import jwt from "@elysiajs/jwt";
import { swagger } from "@elysiajs/swagger";
import { Elysia } from "elysia";
import { auth } from "./server/auth";

import cron from "@elysiajs/cron";
import { logger } from "@grotto/logysia";
import { rateLimit } from "elysia-rate-limit";
import { version } from "../package.json";
import { checkPendingProofs } from "./jobs/checkPendingProofs";
import { log } from "./logger";
import { open } from "./server/open";

log.info`Starting MNT version ${version}...`;

if (!Bun.env.PORT) {
	log.error("No PORT environment variable set");
	process.exit(1);
}

if (!Bun.env.JWT_SECRET) {
	log.error("No JWT_SECRET environment variable set");
	process.exit(1);
}

if (!Bun.env.FRONTEND_URL) {
	log.error("No FRONTEND_URL environment variable set");
	process.exit(1);
}

const app = new Elysia()
	.use(
		logger({
			logIP: false,
			writer: {
				write: (m: string) => {
					log.debug(m);
				},
			},
		}),
	)
	.use(
		cron({
			name: "jobs",
			pattern: "*/1 * * * *",
			// pattern: '*/10 * * * * *',
			run() {
				console.log("Running jobs...");
				checkPendingProofs();
			},
		}),
	)
	.use(
		rateLimit({
			duration: 30000,
			max: 100,
		}),
	)
	.use(
		swagger({
			path: "/docs",
			documentation: {
				info: {
					title: "MNT Documentation",
					version,
				},
			},
		}),
	)
	.group("/v1", (app) => app.use(cors()).use(open))
	.use(
		cors({
			// origin: /.*\.saltyaom\.com$/
			origin: process.env.FRONTEND_URL,
		}),
	)
	.group("/admin", (app) =>
		app
			.use(
				jwt({
					name: "jwt",
					// biome-ignore lint/style/noNonNullAssertion: <explanation>
					secret: Bun.env.JWT_SECRET!,
					exp: "7d",
				}),
			)
			.use(auth),
	)
	.listen(Bun.env.PORT);

log.info`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`;
