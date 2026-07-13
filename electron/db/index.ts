import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

export * as schema from "./schema";

const dbPath =
  process.env.NODE_ENV === "development"
    ? "./forge-db.db"
    : path.join(process.resourcesPath, "./forge-db.db");

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");

export const db = drizzle({ client: sqlite });
