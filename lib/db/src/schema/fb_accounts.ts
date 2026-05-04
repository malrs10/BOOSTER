import { pgTable, text, boolean, timestamp, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const fbAccountsTable = pgTable("fb_accounts", {
  id: serial("id").primaryKey(),
  uid: text("uid").notNull().unique(),
  name: text("name").notNull().default(""),
  avatar: text("avatar").notNull().default(""),
  cookie: text("cookie").notNull(),
  active: boolean("active").notNull().default(true),
  lastUsed: timestamp("last_used"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

const _insertBase = createInsertSchema(fbAccountsTable).omit({ id: true, createdAt: true });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const insertFbAccountSchema = _insertBase as unknown as z.ZodType<any>;
export type InsertFbAccount = {
  uid: string;
  name?: string;
  avatar?: string;
  cookie: string;
  active?: boolean;
  lastUsed?: Date | null;
};
export type FbAccount = typeof fbAccountsTable.$inferSelect;
