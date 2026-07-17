import { ipcMain, type IpcMainInvokeEvent } from "electron"

// `any` is load-bearing here: domains register handlers with concrete, differing
// signatures, and parameters are checked contravariantly, so `unknown[]` rejects
// every one of them. The per-domain Api interfaces are what actually type these
// calls; this registry only routes them.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type IpcHandler = (event: IpcMainInvokeEvent, ...args: any[]) => any

const registered = new Set<string>()

export function registerDomain(domain: string, handlers: Record<string, IpcHandler>) {
  for (const [name, handler] of Object.entries(handlers)) {
    const channel = `${domain}:${name}`
    if (registered.has(channel)) {
      throw new Error(`IPC channel "${channel}" is already registered`)
    }
    registered.add(channel)
    ipcMain.handle(channel, handler)
  }
}
