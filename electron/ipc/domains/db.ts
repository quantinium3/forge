import { sql } from "drizzle-orm"
import { db } from "../../db"
import { registerDomain } from "../registry"

export interface DbApi {
  ping(): Promise<unknown>
}

export function registerDbDomain() {
  registerDomain("db", {
    ping: () => db.get(sql`select 1`),
  })
}
