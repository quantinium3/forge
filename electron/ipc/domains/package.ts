import type { IpcMainInvokeEvent } from "electron"
import { registerDomain } from "../registry"
import { withKuznetsProxy } from "../../lib/tunnel-manager"
import { getServerOrThrow } from "../../utils/get-server"
import {
  fetchAvailablePackages,
  fetchPackages,
  installPackages,
  uninstallPackages,
  type CatalogPackage,
  type Operation,
  type PackageInventory,
} from "../../lib/kuznets"

export interface PackageApi {
  list(serverId: string): Promise<PackageInventory>
  available(serverId: string): Promise<CatalogPackage[]>
  install(serverId: string, packages: string[]): Promise<Operation>
  uninstall(serverId: string, packages: string[]): Promise<Operation>
}

export function registerPackageDomain() {
  registerDomain("package", {
    list: async (_event: IpcMainInvokeEvent, serverId: string) => {
      const server = await getServerOrThrow(serverId)
      return withKuznetsProxy(server, (localPort) => fetchPackages(localPort))
    },

    available: async (_event: IpcMainInvokeEvent, serverId: string) => {
      const server = await getServerOrThrow(serverId)
      return withKuznetsProxy(server, (localPort) => fetchAvailablePackages(localPort))
    },

    install: async (_event: IpcMainInvokeEvent, serverId: string, packages: string[]) => {
      const server = await getServerOrThrow(serverId)
      return withKuznetsProxy(server, (localPort) => installPackages(localPort, packages))
    },

    uninstall: async (_event: IpcMainInvokeEvent, serverId: string, packages: string[]) => {
      const server = await getServerOrThrow(serverId)
      return withKuznetsProxy(server, (localPort) => uninstallPackages(localPort, packages))
    },
  })
}
