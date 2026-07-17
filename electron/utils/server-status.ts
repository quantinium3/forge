import { eq } from "drizzle-orm"
import { BrowserWindow } from "electron"
import { db, schema } from "../db"
import type { SelectServer } from "../db/schema/server"

export async function setServerStatus(serverId: string, status: SelectServer["status"]) {
  await db
    .update(schema.serverTable)
    .set({ status, updatedAt: new Date() })
    .where(eq(schema.serverTable.id, serverId))

  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send("server:status-changed", { serverId, status })
  }
}
