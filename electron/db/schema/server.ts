import { sql } from "drizzle-orm";
import { integer, text } from "drizzle-orm/sqlite-core/columns";
import { sqliteTable } from "drizzle-orm/sqlite-core/table";

export const serverTable = sqliteTable("servers", {
  id: text()
    .primaryKey()
    .$defaultFn(() => `server_${crypto.randomUUID()}`),
  name: text().notNull().unique(),
  address: text().notNull().unique(),
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
});

export type SelectServer = typeof serverTable.$inferSelect;
