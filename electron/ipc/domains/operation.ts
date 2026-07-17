import type { IpcMainInvokeEvent } from "electron"
import { registerDomain } from "../registry"
import { withKuznetsProxy } from "../../lib/tunnel-manager"
import { getServerOrThrow } from "../../utils/get-server"
import { fetchOperation, type Operation } from "../../lib/kuznets"

/**
 * Operations are shared across domains -- packages and deployments both queue
 * them and poll the same endpoint -- so polling lives here rather than being
 * duplicated per domain.
 */
export interface OperationApi {
  get(serverId: string, operationId: number): Promise<Operation>
}

export function registerOperationDomain() {
  registerDomain("operation", {
    get: async (_event: IpcMainInvokeEvent, serverId: string, operationId: number) => {
      const server = await getServerOrThrow(serverId)
      return withKuznetsProxy(server, (localPort) => fetchOperation(localPort, operationId))
    },
  })
}
