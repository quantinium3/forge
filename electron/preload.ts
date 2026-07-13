import { ipcRenderer, contextBridge } from 'electron'

const api = new Proxy(
  {},
  {
    get(_target, domain: string) {
      return new Proxy(
        {},
        {
          get(_t, method: string) {
            return (...args: unknown[]) => ipcRenderer.invoke(`${domain}:${method}`, ...args)
          },
        },
      )
    },
  },
)

contextBridge.exposeInMainWorld('api', api)

contextBridge.exposeInMainWorld('ipcEvents', {
  on(channel: string, listener: (event: Electron.IpcRendererEvent, ...args: unknown[]) => void) {
    ipcRenderer.on(channel, listener)
    return () => ipcRenderer.off(channel, listener)
  },
})
