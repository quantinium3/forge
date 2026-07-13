import { registerHelloDomain, type HelloApi } from "./hello"
import { registerDbDomain, type DbApi } from "./db"

export interface IpcApi {
  hello: HelloApi
  db: DbApi
}

export function registerIpcHandlers() {
  registerHelloDomain()
  registerDbDomain()
}
