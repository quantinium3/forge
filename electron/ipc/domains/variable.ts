import type { IpcMainInvokeEvent } from "electron"
import { registerDomain } from "../registry"
import { withKuznetsProxy } from "../../lib/tunnel-manager"
import { getServerOrThrow } from "../../utils/get-server"
import { deleteVariable, fetchVariables, putVariable, type Variable } from "../../lib/kuznets"

export interface VariableApi {
  list(serverId: string): Promise<Variable[]>
  create(serverId: string, key: string, value: string): Promise<Variable>
  delete(serverId: string, key: string): Promise<{ key: string }>
}

export function registerVariableDomain() {
  registerDomain("variable", {
    list: async (_event: IpcMainInvokeEvent, serverId: string) => {
      const server = await getServerOrThrow(serverId)
      return withKuznetsProxy(server, (localPort) => fetchVariables(localPort))
    },

    create: async (_event: IpcMainInvokeEvent, serverId: string, key: string, value: string) => {
      const server = await getServerOrThrow(serverId)
      return withKuznetsProxy(server, (localPort) => putVariable(localPort, key, value))
    },

    delete: async (_event: IpcMainInvokeEvent, serverId: string, key: string) => {
      const server = await getServerOrThrow(serverId)
      return withKuznetsProxy(server, (localPort) => deleteVariable(localPort, key))
    },
  })
}
