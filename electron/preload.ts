import { ipcRenderer, contextBridge } from 'electron'
import type { IpcApi } from './ipc/domains'

const api: IpcApi = {
  hello: {
    helloWorld: () => ipcRenderer.invoke('hello:helloWorld'),
  },
  db: {
    ping: () => ipcRenderer.invoke('db:ping'),
  },
}

contextBridge.exposeInMainWorld('api', api)

contextBridge.exposeInMainWorld('ipcEvents', {
  on(channel: string, listener: (event: Electron.IpcRendererEvent, ...args: unknown[]) => void) {
    ipcRenderer.on(channel, listener)
    return () => ipcRenderer.off(channel, listener)
  },
})
