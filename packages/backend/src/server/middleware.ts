import type Elysia from "elysia";
import { db } from "../db/db";
import { userTable } from "@mnt/common/db";
import { eq } from "drizzle-orm";
import { takeUniqueOrUndefinded } from "../db/orm-helpers/orm-helper";
import { log } from "../logger";

export const isAuthenticated = (app: Elysia) =>
    app.derive(async ({ jwt, set, headers }) => {
      log.debug`Accessing protected endpoint...`
      const auth = headers['authorization']
      const token = auth && auth.startsWith('Bearer ') ? auth.slice(7) : null
      if (!token) {
        log.warn`Authorization token not set`
        set.status = 401;
        return {
          success: false,
          message: "Unauthorized",
          data: null,
        };
      }

      const { userId } = await jwt.verify(token);
      if (!userId) {
        log.warn`User param not found in token: ${token}`
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
      log.debug`Authorized: ${userId}`

      return {
        user,
      };
    });