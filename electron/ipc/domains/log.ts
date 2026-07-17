import { desc, eq } from "drizzle-orm"
import { BrowserWindow, type IpcMainInvokeEvent } from "electron"
import { db, schema } from "../../db"
import { registerDomain } from "../registry"
import type { SelectLog } from "../../db/schema/log"

export type LogLevel = SelectLog["level"]

export interface LogApi {
  list(serverId: string): Promise<SelectLog[]>
}

export async function createLog(
  serverId: string,
  level: LogLevel,
  message: string,
): Promise<SelectLog | undefined> {
  const trimmed = message.trim()
  if (!trimmed) return undefined

  const [row] = await db
    .insert(schema.logTable)
    .values({ serverId, level, message: trimmed })
    .returning()

  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send("server:log", row)
  }

  return row
}

export function registerLogDomain() {
  registerDomain("log", {
    list: (_event: IpcMainInvokeEvent, serverId: string) =>
      db
        .select()
        .from(schema.logTable)
        .where(eq(schema.logTable.serverId, serverId))
        .orderBy(desc(schema.logTable.createdAt)),
  })
}
