import { ipcMain, type IpcMainInvokeEvent } from "electron"

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
