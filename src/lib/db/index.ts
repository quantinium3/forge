import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

const dbPath =
  process.env.NODE_ENV === "development"
    ? "./demo_table.db"
    : path.join(process.resourcesPath, "./demo_table.db");

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");

export const db = drizzle({ client: sqlite });
