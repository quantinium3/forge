import { and, desc, eq, inArray, isNotNull, isNull } from "drizzle-orm"
import type { IpcMainInvokeEvent } from "electron"
import { db, schema } from "../../db"
import { registerDomain } from "../registry"
import type { SelectServer } from "../../db/schema/server"
import { provisionServer } from "../../provision/kuznets"
import { refreshServer } from "../../provision/refresh"
import { withKuznetsProxy } from "../../lib/tunnel-manager"
import { getServerOrThrow } from "../../utils/get-server"
import { fetchSysinfo, type SystemInfo } from "../../lib/kuznets"

export interface CreateServerInput {
  name: string
  address: string
  username: string
  sshPort: number
  privateKeyPath: string
  passphrase?: string | null
}

export interface ServerApi {
  list(): Promise<SelectServer[]>
  get(id: string): Promise<SelectServer | undefined>
  create(input: CreateServerInput): Promise<SelectServer>
  delete(ids: string[]): Promise<void>
  sysinfo(id: string): Promise<SystemInfo>
  refresh(id: string): Promise<void>
}

export function registerServerDomain() {
  registerDomain("server", {
    list: () =>
      db
        .select()
        .from(schema.serverTable)
        .where(isNull(schema.serverTable.deletedAt)),

    get: async (_event: IpcMainInvokeEvent, id: string) => {
      const [row] = await db
        .select()
        .from(schema.serverTable)
        .where(eq(schema.serverTable.id, id))
        .limit(1)
      return row
    },

    create: async (_event: IpcMainInvokeEvent, input: CreateServerInput) => {
      const [deletedMatch] = await db
        .select()
        .from(schema.serverTable)
        .where(
          and(
            eq(schema.serverTable.address, input.address),
            eq(schema.serverTable.username, input.username),
            isNotNull(schema.serverTable.deletedAt),
          ),
        )
        .orderBy(desc(schema.serverTable.deletedAt))
        .limit(1)

      if (deletedMatch) {
        const [row] = await db
          .update(schema.serverTable)
          .set({
            name: input.name,
            sshPort: input.sshPort,
            privateKeyPath: input.privateKeyPath,
            passphrase: input.passphrase || null,
            status: "initializing",
            deletedAt: null,
            updatedAt: new Date(),
          })
          .where(eq(schema.serverTable.id, deletedMatch.id))
          .returning()
        void provisionServer(row)
        return row
      }

      const [row] = await db
        .insert(schema.serverTable)
        .values({
          name: input.name,
          address: input.address,
          username: input.username,
          sshPort: input.sshPort,
          privateKeyPath: input.privateKeyPath,
          passphrase: input.passphrase || null,
          status: "initializing",
        })
        .returning()
      void provisionServer(row)
      return row
    },

    delete: async (_event: IpcMainInvokeEvent, ids: string[]) => {
      await db
        .update(schema.serverTable)
        .set({ deletedAt: new Date() })
        .where(inArray(schema.serverTable.id, ids))
    },

    sysinfo: async (_event: IpcMainInvokeEvent, id: string) => {
      const server = await getServerOrThrow(id)
      return withKuznetsProxy(server, (localPort) => fetchSysinfo(localPort))
    },

    refresh: async (_event: IpcMainInvokeEvent, id: string) => {
      const server = await getServerOrThrow(id)
      if (server.status !== "success") {
        throw new Error("Server must be provisioned before it can be refreshed")
      }

      await refreshServer(server)
    },
  })
}
