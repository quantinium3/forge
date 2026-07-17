import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { serverTable } from "./server";
import { sql } from "drizzle-orm";

export const logTable = sqliteTable(
  "logs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => `log_${crypto.randomUUID()}`),
    serverId: text("server_id")
      .notNull()
      .references(() => serverTable.id),
    level: text("level", {
      enum: ["info", "warn", "error", "debug", "fatal"],
    }).notNull(),
    message: text("message").notNull(),
    timestamp: text("timestamp")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(strftime('%s', 'now'))`),
  },
  (table) => [index("logs_server_id_timestamp_idx").on(table.serverId, table.timestamp)],
);

export type SelectLog = typeof logTable.$inferSelect;
