import { registerHelloDomain, type HelloApi } from "./hello"

export interface IpcApi {
  hello: HelloApi
}

export function registerIpcHandlers() {
  registerHelloDomain()
}
