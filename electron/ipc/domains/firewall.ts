import type { IpcMainInvokeEvent } from "electron"
import { registerDomain } from "../registry"
import { withKuznetsProxy } from "../../lib/tunnel-manager"
import { getServerOrThrow } from "../../utils/get-server"
import {
  closeFirewallPort,
  fetchFirewall,
  openFirewallPort,
  setFirewall,
  type FirewallState,
  type OpenPortInput,
} from "../../lib/kuznets"

export interface FirewallApi {
  get(serverId: string): Promise<FirewallState>
  setEnabled(serverId: string, enabled: boolean): Promise<FirewallState>
  openPort(serverId: string, input: OpenPortInput): Promise<FirewallState>
  closePort(serverId: string, ruleId: number): Promise<FirewallState>
}

export function registerFirewallDomain() {
  registerDomain("firewall", {
    get: async (_event: IpcMainInvokeEvent, serverId: string) => {
      const server = await getServerOrThrow(serverId)
      return withKuznetsProxy(server, (localPort) => fetchFirewall(localPort))
    },

    /**
     * The ssh port is taken from the server record rather than the renderer:
     * it is the port this connection is running over, and kuznets must store it
     * to rebuild the rules after a reboot without locking the operator out.
     */
    setEnabled: async (_event: IpcMainInvokeEvent, serverId: string, enabled: boolean) => {
      const server = await getServerOrThrow(serverId)
      return withKuznetsProxy(server, (localPort) =>
        setFirewall(localPort, { enabled, ssh_port: server.sshPort }),
      )
    },

    openPort: async (_event: IpcMainInvokeEvent, serverId: string, input: OpenPortInput) => {
      const server = await getServerOrThrow(serverId)
      return withKuznetsProxy(server, (localPort) => openFirewallPort(localPort, input))
    },

    closePort: async (_event: IpcMainInvokeEvent, serverId: string, ruleId: number) => {
      const server = await getServerOrThrow(serverId)
      return withKuznetsProxy(server, (localPort) => closeFirewallPort(localPort, ruleId))
    },
  })
}
