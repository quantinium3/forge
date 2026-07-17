import type { IpcMainInvokeEvent } from "electron"
import { registerDomain } from "../registry"
import { withKuznetsProxy } from "../../lib/tunnel-manager"
import { getServerOrThrow } from "../../utils/get-server"
import {
  deleteSecret,
  fetchSecretValue,
  fetchSecrets,
  putSecret,
  type SecretMeta,
  type SecretValue,
} from "../../lib/kuznets"

export interface SecretApi {
  list(serverId: string): Promise<SecretMeta[]>
  reveal(serverId: string, key: string): Promise<SecretValue>
  create(serverId: string, key: string, value: string): Promise<{ key: string }>
  delete(serverId: string, key: string): Promise<{ key: string }>
}

export function registerSecretDomain() {
  registerDomain("secret", {
    list: async (_event: IpcMainInvokeEvent, serverId: string) => {
      const server = await getServerOrThrow(serverId)
      return withKuznetsProxy(server, (localPort) => fetchSecrets(localPort))
    },

    reveal: async (_event: IpcMainInvokeEvent, serverId: string, key: string) => {
      const server = await getServerOrThrow(serverId)
      return withKuznetsProxy(server, (localPort) => fetchSecretValue(localPort, key))
    },

    create: async (_event: IpcMainInvokeEvent, serverId: string, key: string, value: string) => {
      const server = await getServerOrThrow(serverId)
      return withKuznetsProxy(server, (localPort) => putSecret(localPort, key, value))
    },

    delete: async (_event: IpcMainInvokeEvent, serverId: string, key: string) => {
      const server = await getServerOrThrow(serverId)
      return withKuznetsProxy(server, (localPort) => deleteSecret(localPort, key))
    },
  })
}
