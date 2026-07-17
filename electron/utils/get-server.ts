import { eq } from "drizzle-orm"
import { db, schema } from "../db"
import type { SelectServer } from "../db/schema/server"

export async function getServerOrThrow(serverId: string): Promise<SelectServer> {
  const [server] = await db
    .select()
    .from(schema.serverTable)
    .where(eq(schema.serverTable.id, serverId))
    .limit(1)

  if (!server) {
    throw new Error(`Server ${serverId} not found`)
  }
  return server
}
