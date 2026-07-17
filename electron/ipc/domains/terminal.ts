import type { IpcMainInvokeEvent } from "electron"
import { registerDomain } from "../registry"
import { getServerOrThrow } from "../../utils/get-server"
import { SshSession, type ShellHandle } from "../../lib/ssh"

export interface TerminalApi {
  open(serverId: string, cols: number, rows: number): Promise<{ channelId: string }>
  write(channelId: string, data: string): Promise<void>
  resize(channelId: string, cols: number, rows: number): Promise<void>
  close(channelId: string): Promise<void>
}

interface TerminalSession {
  session: SshSession
  shell: ShellHandle
}

const sessions = new Map<string, TerminalSession>()

export function registerTerminalDomain() {
  registerDomain("terminal", {
    open: async (event: IpcMainInvokeEvent, serverId: string, cols: number, rows: number) => {
      const server = await getServerOrThrow(serverId)
      const session = await SshSession.connect({
        host: server.address,
        port: server.sshPort,
        username: server.username,
        privateKeyPath: server.privateKeyPath,
        passphrase: server.passphrase,
      })

      let shell: ShellHandle
      try {
        shell = await session.openShell(cols, rows)
      } catch (error) {
        session.end()
        throw error
      }

      const channelId = `term_${crypto.randomUUID()}`
      sessions.set(channelId, { session, shell })

      shell.onData((data) => event.sender.send("terminal:data", { channelId, data }))
      shell.onClose(() => {
        // Guards against a double-teardown race with the explicit `close`
        // handler below -- Map.delete()'s boolean return only fires once.
        if (!sessions.delete(channelId)) return
        session.end()
        event.sender.send("terminal:closed", { channelId })
      })

      return { channelId }
    },

    write: (_event: IpcMainInvokeEvent, channelId: string, data: string) => {
      sessions.get(channelId)?.shell.write(data)
    },

    resize: (_event: IpcMainInvokeEvent, channelId: string, cols: number, rows: number) => {
      sessions.get(channelId)?.shell.resize(cols, rows)
    },

    close: (_event: IpcMainInvokeEvent, channelId: string) => {
      const entry = sessions.get(channelId)
      if (!entry) return
      sessions.delete(channelId)
      entry.shell.close()
      entry.session.end()
    },
  })
}
