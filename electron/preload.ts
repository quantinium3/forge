import { ipcRenderer, contextBridge } from 'electron'
import type { IpcApi } from './ipc/domains'
import type { CreateServerInput } from './ipc/domains/server'
import type { DeployStaticInput } from './ipc/domains/deployment'
import type { PutDeploymentInput } from './lib/kuznets'

const api: IpcApi = {
  hello: {
    helloWorld: () => ipcRenderer.invoke('hello:helloWorld'),
  },
  db: {
    ping: () => ipcRenderer.invoke('db:ping'),
  },
  util: {
    openFile: () => ipcRenderer.invoke('util:openFile'),
    openDirectory: () => ipcRenderer.invoke('util:openDirectory'),
    copyText: (text: string) => ipcRenderer.invoke('util:copyText', text),
  },
  server: {
    list: () => ipcRenderer.invoke('server:list'),
    get: (id: string) => ipcRenderer.invoke('server:get', id),
    create: (input: CreateServerInput) => ipcRenderer.invoke('server:create', input),
    delete: (ids: string[]) => ipcRenderer.invoke('server:delete', ids),
    sysinfo: (id: string) => ipcRenderer.invoke('server:sysinfo', id),
    refresh: (id: string) => ipcRenderer.invoke('server:refresh', id),
  },
  log: {
    list: (serverId: string) => ipcRenderer.invoke('log:list', serverId),
  },
  terminal: {
    open: (serverId: string, cols: number, rows: number) =>
      ipcRenderer.invoke('terminal:open', serverId, cols, rows),
    write: (channelId: string, data: string) => ipcRenderer.invoke('terminal:write', channelId, data),
    resize: (channelId: string, cols: number, rows: number) =>
      ipcRenderer.invoke('terminal:resize', channelId, cols, rows),
    close: (channelId: string) => ipcRenderer.invoke('terminal:close', channelId),
  },
  package: {
    list: (serverId: string) => ipcRenderer.invoke('package:list', serverId),
    available: (serverId: string) => ipcRenderer.invoke('package:available', serverId),
    install: (serverId: string, packages: string[]) =>
      ipcRenderer.invoke('package:install', serverId, packages),
    uninstall: (serverId: string, packages: string[]) =>
      ipcRenderer.invoke('package:uninstall', serverId, packages),
  },
  operation: {
    get: (serverId: string, operationId: number) =>
      ipcRenderer.invoke('operation:get', serverId, operationId),
  },
  deployment: {
    list: (serverId: string) => ipcRenderer.invoke('deployment:list', serverId),
    create: (serverId: string, input: PutDeploymentInput) =>
      ipcRenderer.invoke('deployment:create', serverId, input),
    deployStatic: (serverId: string, input: DeployStaticInput) =>
      ipcRenderer.invoke('deployment:deployStatic', serverId, input),
    delete: (serverId: string, name: string) => ipcRenderer.invoke('deployment:delete', serverId, name),
  },
  secret: {
    list: (serverId: string) => ipcRenderer.invoke('secret:list', serverId),
    reveal: (serverId: string, key: string) => ipcRenderer.invoke('secret:reveal', serverId, key),
    create: (serverId: string, key: string, value: string) =>
      ipcRenderer.invoke('secret:create', serverId, key, value),
    delete: (serverId: string, key: string) => ipcRenderer.invoke('secret:delete', serverId, key),
  },
  variable: {
    list: (serverId: string) => ipcRenderer.invoke('variable:list', serverId),
    create: (serverId: string, key: string, value: string) =>
      ipcRenderer.invoke('variable:create', serverId, key, value),
    delete: (serverId: string, key: string) => ipcRenderer.invoke('variable:delete', serverId, key),
  },
}

contextBridge.exposeInMainWorld('api', api)

contextBridge.exposeInMainWorld('ipcEvents', {
  on(channel: string, listener: (event: Electron.IpcRendererEvent, ...args: unknown[]) => void) {
    ipcRenderer.on(channel, listener)
    return () => ipcRenderer.off(channel, listener)
  },
})
