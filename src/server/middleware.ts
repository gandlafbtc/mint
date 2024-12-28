import type Elysia from "elysia";
import { db } from "../db/db";
import { userTable } from "../db/schema";
import { eq } from "drizzle-orm";
import { takeUniqueOrUndefinded } from "../db/orm-helpers/orm-helper";

export const isAuthenticated = (app: Elysia) =>
    app.derive(async ({ jwt, set, headers }) => {
      const auth = headers['authorization']
      const token = auth && auth.startsWith('Bearer ') ? auth.slice(7) : null
      if (!token) {
        set.status = 401;
        return {
          success: false,
          message: "Unauthorized",
          data: null,
        };
      }

      const { userId } = await jwt.verify(token);
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
      return {
        user,
      };
    });