import { sql } from "drizzle-orm";
import { integer, text } from "drizzle-orm/sqlite-core/columns";
import { sqliteTable } from "drizzle-orm/sqlite-core/table";
import { uniqueIndex } from "drizzle-orm/sqlite-core";

export const serverTable = sqliteTable(
  "servers",
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => `server_${crypto.randomUUID()}`),
    name: text().notNull(),
    address: text().notNull(),
    username: text().notNull(),
    sshPort: integer("ssh_port").notNull().default(22),
    privateKeyPath: text("private_key_path").notNull(),
    passphrase: text("passphrase"),
    status: text("status", {
      enum: ["initializing", "failed", "success"],
    }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(strftime('%s', 'now'))`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(strftime('%s', 'now'))`),
    deletedAt: integer("deleted_at", { mode: "timestamp" }),
  },
  (table) => [
    uniqueIndex("servers_name_active_unique_idx")
      .on(table.name)
      .where(sql`${table.deletedAt} is null`),
    uniqueIndex("servers_address_active_unique_idx")
      .on(table.address)
      .where(sql`${table.deletedAt} is null`),
  ],
);

export type SelectServer = typeof serverTable.$inferSelect;
