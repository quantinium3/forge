import { registerAppDomain, type AppApi } from "./app"
import { registerWindowDomain, type WindowApi } from "./window"

export interface IpcApi {
  app: AppApi
  window: WindowApi
}

export function registerIpcHandlers() {
  registerAppDomain()
  registerWindowDomain()
}
